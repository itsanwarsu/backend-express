const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

console.log("GOOGLE_CLIENT_ID:", !!process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", !!process.env.GOOGLE_CLIENT_SECRET);
console.log("GOOGLE_CALLBACK_URL:", process.env.GOOGLE_CALLBACK_URL);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Email tidak tersedia dari akun Google ini"), null);
        }

        let user = await User.findOne({ email }).select("-password");

        // Jika user belum ada
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            provider: "google",
            name: profile.displayName,
            email,
            role: "user",
          });
        } else {
          // Update googleId jika login pakai email lama
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = "google";
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize hanya simpan ID user ke session (bukan seluruh dokumen)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize ambil ulang user dari DB, exclude password
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
