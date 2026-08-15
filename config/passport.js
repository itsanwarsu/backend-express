const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const prisma = require("./prisma");

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
          return done(
            new Error("Email tidak tersedia dari akun Google ini"),
            null
          );
        }

        // Cari user berdasarkan email
        let user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        // User belum ada → buat user baru
        if (!user) {
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              provider: "google",
              name: profile.displayName,
              email,
              role: "user",
            },
          });
        } else {
          // User sudah ada tetapi belum memiliki Google ID
          if (!user.googleId) {
            user = await prisma.user.update({
              where: {
                id: user.id,
              },
              data: {
                googleId: profile.id,
                provider: "google",
              },
            });
          }
        }

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);

        return done(error, null);
      }
    }
  )
);

// Serialize ID PostgreSQL
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user dari PostgreSQL
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!user) {
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
