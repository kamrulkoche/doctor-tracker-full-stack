import { getData, postData, resetCsrfToken } from "@/services/api-client";
import type { User } from "@/types/models";

export type LoginInput = { email: string; password: string };

export const authApi = {
  async me(signal?: AbortSignal): Promise<User> {
    const data = await getData<{ user: User }>("/auth/me", { signal });
    return data.user;
  },

  async login(input: LoginInput): Promise<User> {
    const data = await postData<{ user: User }, LoginInput>("/auth/login", input);
    return data.user;
  },

  async logout(): Promise<void> {
    await postData<null>("/auth/logout");
    resetCsrfToken();
  },
};
