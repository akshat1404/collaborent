package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type User struct {
	Email       string    `bson:"email"`
	Name        string    `bson:"name"`
	Avatar      string    `bson:"avatar"`
	SupabaseID  string    `bson:"supabaseId"`
	CreatedAt   time.Time `bson:"createdAt"`
	LastLoginAt time.Time `bson:"lastLoginAt"`
}

var userCollection *mongo.Collection
var jwks keyfunc.Keyfunc

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func authCallbackHandler(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

	token, err := jwt.Parse(tokenStr, jwks.Keyfunc)
	if err != nil || !token.Valid {
		log.Println("JWT error:", err)
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	claims := token.Claims.(jwt.MapClaims)
	supabaseID := claims["sub"].(string)
	email, _ := claims["email"].(string)
	metadata, _ := claims["user_metadata"].(map[string]interface{})
	name, _ := metadata["full_name"].(string)
	avatar, _ := metadata["avatar_url"].(string)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	filter := bson.M{"supabaseId": supabaseID}
	update := bson.M{
		"$set": bson.M{
			"email":       email,
			"name":        name,
			"avatar":      avatar,
			"lastLoginAt": time.Now(),
		},
		"$setOnInsert": bson.M{
			"supabaseId": supabaseID,
			"createdAt":  time.Now(),
		},
	}
	opts := options.UpdateOne().SetUpsert(true)

	_, err = userCollection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"email":  email,
		"name":   name,
	})
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", os.Getenv("SUPABASE_URL"))
	var err error
	jwks, err = keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		log.Fatal("Failed to fetch JWKS:", err)
	}
	log.Println("JWKS loaded from Supabase")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(os.Getenv("MONGODB_URI")))
	if err != nil {
		log.Fatal("MongoDB connection failed:", err)
	}
	defer client.Disconnect(ctx)

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("MongoDB ping failed:", err)
	}
	log.Println("Connected to MongoDB")

	userCollection = client.Database(os.Getenv("MONGODB_DB")).Collection("users")

	http.HandleFunc("/health", corsMiddleware(healthHandler))
	http.HandleFunc("/auth/callback", corsMiddleware(authCallbackHandler))

	log.Println("Backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
