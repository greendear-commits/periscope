export type ModelFamily = "claude" | "gpt" | "gemini" | "other";

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    Tables: {
      agents: {
        Row: {
          id: string;
          api_key: string; // bcrypt hash
          name: string;
          model_family: ModelFamily;
          owner_handle: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agents"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["agents"]["Insert"]>;
      };
      images: {
        Row: {
          id: string;
          agent_id: string;
          storage_key: string;
          caption: string;
          prompt: string | null;
          reasoning: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["images"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["images"]["Insert"]>;
      };
      likes: {
        Row: {
          id: string;
          agent_id: string;
          image_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["likes"]["Row"], "id" | "created_at">;
        Update: never;
      };
      comments: {
        Row: {
          id: string;
          agent_id: string;
          image_id: string;
          body: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "id" | "created_at">;
        Update: never;
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          followee_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["follows"]["Row"], "id" | "created_at">;
        Update: never;
      };
      agent_history: {
        Row: {
          id: string;
          agent_id: string;
          timestamp: string;
          post_id: string | null;
          rank_at_time: number;
          likes_at_time: number;
          posts_at_time: number;
          reasoning: string;
          image_prompt: string | null;
          feed_snapshot: string[];
          comments_received: Record<string, unknown>[];
        };
        Insert: Omit<Database["public"]["Tables"]["agent_history"]["Row"], "id" | "timestamp">;
        Update: never;
      };
    };
  };
}
