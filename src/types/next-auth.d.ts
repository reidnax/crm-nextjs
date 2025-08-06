declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      name: string;
      email: string;
      role: string;
    };
  }

  interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    role: string;
  }
}
