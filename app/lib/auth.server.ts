import { supabaseAdmin } from "./supabase.server";

// Note: User profile creation in database is deferred until Prisma is properly integrated

export async function createUserAccountAuth(
  email: string,
  password: string,
  name: string
) {
  // Create user in Supabase Auth only
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
    },
  });

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Failed to create user");
  }

  return data.user;
}

export async function getUserByEmail(email: string) {
  // TODO: Implement with Prisma when database integration is ready
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find(u => u.email === email) || null;
}

export async function getUserById(id: string) {
  // TODO: Implement with Prisma when database integration is ready
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error) throw error;
  return data.user || null;
}

export async function updateUserProfile(
  id: string,
  data: {
    name?: string;
    bio?: string;
    avatarUrl?: string;
  }
) {
  // TODO: Implement with Prisma when database integration is ready
  const updateData: any = {};
  if (data.name) {
    updateData.user_metadata = { name: data.name };
  }
  
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { user_metadata: updateData.user_metadata });
  if (error) throw error;
  return true;
}

export async function getArtistProfile(artistId: string) {
  // TODO: Implement with Prisma when database integration is ready
  throw new Error("Artist profile retrieval not yet implemented");
}
