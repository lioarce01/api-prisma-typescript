import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { auth } from "express-openid-connect";
import { requiresAuth } from "express-openid-connect";

const app = express();
const prisma = new PrismaClient();

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(auth(config));

app.get('/', (req, res) => {
  res.render('index', { 
    title: "Demo",
    isAuthenticated: req.oidc.isAuthenticated(),
    user: req.oidc.user,
  });
});

app.set("views", "./src/views");
app.set("view engine", "ejs")


// get all posts
app.get("/posts", async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        published: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ posts });
  } catch (error: any) {
    next(error.message);
  }
});

// get a profile

app.get("/profile", requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
})

// get all users
app.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        posts: true,
      },
    });

    res.json({ users });
  } catch (error: any) {
    next(error.message);
  }
});

// create a posts
app.post("/posts", async (req, res, next) => {
  try {
    const post = await prisma.post.create({
      // crear un post desde el id del usuario que lo crea
      data: {
        author: {
          connect: {
            id: req.body.authorId,
          },
        },
        title: req.body.title,
        published: req.body.published,
      }
    });

    if (!post) {
      return res.json({ message: "This title already exists" });
    } else {
      res.json({ post });
    }

  } catch (error: any) {
    next(error.message);
  }
});

// get a post by id
app.get("/posts/:id", async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: {
        id: (req.params as any).id,
      },
    });

    res.json({ post });
  } catch (error: any) {
    next(error.message);
  }
});

// update a post
app.patch("/posts/:id", async (req, res, next) => {
  try {
    const post = await prisma.post.update({
      where: {
        id: (req.params as any).id,
      },
      data: req.body,
    });

    res.json({ post });

  } catch (error: any) {
    next(error.message);
  }
});

// delete a post
app.delete("/posts/:id", async (req, res, next) => {
  try {
    await prisma.post.delete({
      where: {
        id: (req.params as any).id,
      },
    });

    res.sendStatus(200);
  } catch (error: any) {
    next(error.message);
  }
});

// get a user's posts
app.get("/users/:id/posts", async (req, res, next) => {
  try {
    const usersWithPosts = await prisma.user.findUnique({
      where: {
        id: (req.params as any).id,
      },
      include: {
        posts: {
          where: {
            published: true,
          },
        },
      },
    });

    const posts = usersWithPosts?.posts;

    res.json({ posts });
  } catch (error: any) {
    next(error.message);
  }
});

app.listen(3000, () => {
  console.log("App listening on port 3000");
});
