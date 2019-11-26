print("=== Initializing ===");

db.createUser(
    {
        user: "nestify",
        pwd: "12345678",
        roles: [{ role: "readWrite", db: "nestify" }]
    }
);

print("=== Initialized ===");

