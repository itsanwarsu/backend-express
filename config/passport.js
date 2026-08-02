const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;


        let user = await User.findOne({ email });


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

          // Update googleId jika login email lama
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = "google";
            await user.save();
          }

        }


        // Kirim user ke controller
        return done(null, user);


      } catch (error) {

        return done(error, null);

      }
    }
  )
);
