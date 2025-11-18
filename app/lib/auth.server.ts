import { supabaseAdmin } from "./supabase.server";
import { prisma } from "./db.server";
import { UserRole } from "@prisma/client";

export async function createUserAccount(
  email: string,
  password: string,
  name: string,
  role: UserRole = "REGULAR_USER"
) {
  // Create user in Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Failed to create user");
  }

  // Create user record in database
  const user = await prisma.user.create({
    data: {
      id: data.user.id,
      email,
      name,
      role,
    },
  });

  return user;
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function updateUserProfile(
  id: string,
  data: {
    name?: string;
    bio?: string;
    avatarUrl?: string;
  }
) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function getArtistProfile(artistId: string) {
  return prisma.user.findUnique({
    where: { id: artistId },
    include: {
      claimedArtworks: {
        where: { claimStatus: "CLAIMED" },
        include: {
          galleries: {
            include: {
              photos: {
                include: {
                  photo: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
