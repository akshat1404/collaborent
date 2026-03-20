package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func signInRedirectionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"Status": "Success", "Message": "You have been signed in successfully"})
}

func main() {

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

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

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/auth/callback", signInRedirectionHandler)
	log.Println("Backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
