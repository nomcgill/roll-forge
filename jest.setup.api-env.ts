// Provide fake values so requiredEnv() doesn't throw in tests
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
process.env.FACEBOOK_CLIENT_ID = "test-facebook-id";
process.env.FACEBOOK_CLIENT_SECRET = "test-facebook-secret";
