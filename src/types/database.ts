/**
 * Tipagem do banco de dados Supabase — escrita manualmente para refletir o
 * schema definido na migration inicial (supabase/migrations).
 *
 * Estrutura compatível com o formato gerado por `supabase gen types typescript`,
 * para permitir substituição direta quando o projeto Supabase estiver conectado:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * Enquanto isso, mantém o app tipado sem uso de `any`.
 */

export type PropertyPurpose = "sale" | "rent";

export type PropertyStatus =
  | "available"
  | "reserved"
  | "sold"
  | "rented"
  | "hidden";

export type SolarPosition =
  | "nascente"
  | "sul"
  | "norte"
  | "poente"
  | "nascente_sul"
  | "other";

type Timestamp = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          state: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          state: string;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          state?: string;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
      neighborhoods: {
        Row: {
          id: string;
          city_id: string;
          name: string;
          slug: string;
          active: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          city_id: string;
          name: string;
          slug: string;
          active?: boolean;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          city_id?: string;
          name?: string;
          slug?: string;
          active?: boolean;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "neighborhoods_city_id_fkey";
            columns: ["city_id"];
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
          active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          code: string;
          title: string;
          slug: string;
          description: string | null;
          property_type: string;
          purpose: PropertyPurpose;
          status: PropertyStatus;
          featured: boolean;
          tag: string | null;
          sale_price: number | null;
          rent_price: number | null;
          condominium_fee: number | null;
          iptu: number | null;
          accepts_financing: boolean;
          city_id: string | null;
          neighborhood_id: string | null;
          address: string | null;
          address_number: string | null;
          complement: string | null;
          postal_code: string | null;
          latitude: number | null;
          longitude: number | null;
          show_exact_address: boolean;
          private_area: number | null;
          total_area: number | null;
          external_area: number | null;
          bedrooms: number;
          suites: number;
          bathrooms: number;
          parking_spaces: number;
          floor: number | null;
          solar_position: SolarPosition | null;
          youtube_url: string | null;
          instagram_url: string | null;
          virtual_tour_url: string | null;
          partner_id: string | null;
          active: boolean;
          published_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          slug: string;
          description?: string | null;
          property_type: string;
          purpose: PropertyPurpose;
          status?: PropertyStatus;
          featured?: boolean;
          tag?: string | null;
          sale_price?: number | null;
          rent_price?: number | null;
          condominium_fee?: number | null;
          iptu?: number | null;
          accepts_financing?: boolean;
          city_id?: string | null;
          neighborhood_id?: string | null;
          address?: string | null;
          address_number?: string | null;
          complement?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          show_exact_address?: boolean;
          private_area?: number | null;
          total_area?: number | null;
          external_area?: number | null;
          bedrooms?: number;
          suites?: number;
          bathrooms?: number;
          parking_spaces?: number;
          floor?: number | null;
          solar_position?: SolarPosition | null;
          youtube_url?: string | null;
          instagram_url?: string | null;
          virtual_tour_url?: string | null;
          partner_id?: string | null;
          active?: boolean;
          published_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          property_type?: string;
          purpose?: PropertyPurpose;
          status?: PropertyStatus;
          featured?: boolean;
          tag?: string | null;
          sale_price?: number | null;
          rent_price?: number | null;
          condominium_fee?: number | null;
          iptu?: number | null;
          accepts_financing?: boolean;
          city_id?: string | null;
          neighborhood_id?: string | null;
          address?: string | null;
          address_number?: string | null;
          complement?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          show_exact_address?: boolean;
          private_area?: number | null;
          total_area?: number | null;
          external_area?: number | null;
          bedrooms?: number;
          suites?: number;
          bathrooms?: number;
          parking_spaces?: number;
          floor?: number | null;
          solar_position?: SolarPosition | null;
          youtube_url?: string | null;
          instagram_url?: string | null;
          virtual_tour_url?: string | null;
          partner_id?: string | null;
          active?: boolean;
          published_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey";
            columns: ["city_id"];
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_partner_id_fkey";
            columns: ["partner_id"];
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      property_images: {
        Row: {
          id: string;
          property_id: string;
          storage_path: string;
          alt_text: string | null;
          sort_order: number;
          is_cover: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          property_id: string;
          storage_path: string;
          alt_text?: string | null;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          property_id?: string;
          storage_path?: string;
          alt_text?: string | null;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      features: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string | null;
          active: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          category?: string | null;
          active?: boolean;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          category?: string | null;
          active?: boolean;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
      property_features: {
        Row: {
          property_id: string;
          feature_id: string;
          created_at: Timestamp;
        };
        Insert: {
          property_id: string;
          feature_id: string;
          created_at?: Timestamp;
        };
        Update: {
          property_id?: string;
          feature_id?: string;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "property_features_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_features_feature_id_fkey";
            columns: ["feature_id"];
            referencedRelation: "features";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          name: string | null;
          phone: string;
          email: string | null;
          property_id: string | null;
          property_code: string | null;
          source: string | null;
          message: string | null;
          lead_type: string | null;
          property_type: string | null;
          city: string | null;
          neighborhood: string | null;
          estimated_value: number | null;
          bedrooms: number | null;
          area: number | null;
          status: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name?: string | null;
          phone: string;
          email?: string | null;
          property_id?: string | null;
          property_code?: string | null;
          source?: string | null;
          message?: string | null;
          lead_type?: string | null;
          property_type?: string | null;
          city?: string | null;
          neighborhood?: string | null;
          estimated_value?: number | null;
          bedrooms?: number | null;
          area?: number | null;
          status?: string;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          name?: string | null;
          phone?: string;
          email?: string | null;
          property_id?: string | null;
          property_code?: string | null;
          source?: string | null;
          message?: string | null;
          lead_type?: string | null;
          property_type?: string | null;
          city?: string | null;
          neighborhood?: string | null;
          estimated_value?: number | null;
          bedrooms?: number | null;
          area?: number | null;
          status?: string;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "leads_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: string;
          active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: string;
          active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: string;
          active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      orulo_buildings: {
        Row: {
          external_id: string;
          name: string | null;
          developer: string | null;
          city: string | null;
          neighborhood: string | null;
          address: string | null;
          description: string | null;
          min_price: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          suites: number | null;
          parking: number | null;
          private_area: number | null;
          status: string | null;
          external_updated_at: Timestamp | null;
          published: boolean;
          published_at: Timestamp | null;
          slug: string | null;
          max_bedrooms: number | null;
          max_area: number | null;
          cover_image_id: string | null;
          typologies: Json | null;
          raw: Json;
          images: Json | null;
          floor_plans: Json | null;
          synced_at: Timestamp;
          created_at: Timestamp;
        };
        Insert: {
          external_id: string;
          name?: string | null;
          developer?: string | null;
          city?: string | null;
          neighborhood?: string | null;
          address?: string | null;
          description?: string | null;
          min_price?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          suites?: number | null;
          parking?: number | null;
          private_area?: number | null;
          status?: string | null;
          external_updated_at?: Timestamp | null;
          published?: boolean;
          published_at?: Timestamp | null;
          slug?: string | null;
          max_bedrooms?: number | null;
          max_area?: number | null;
          cover_image_id?: string | null;
          typologies?: Json | null;
          raw: Json;
          images?: Json | null;
          floor_plans?: Json | null;
          synced_at?: Timestamp;
          created_at?: Timestamp;
        };
        Update: {
          external_id?: string;
          name?: string | null;
          developer?: string | null;
          city?: string | null;
          neighborhood?: string | null;
          address?: string | null;
          description?: string | null;
          min_price?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          suites?: number | null;
          parking?: number | null;
          private_area?: number | null;
          status?: string | null;
          external_updated_at?: Timestamp | null;
          published?: boolean;
          published_at?: Timestamp | null;
          slug?: string | null;
          max_bedrooms?: number | null;
          max_area?: number | null;
          cover_image_id?: string | null;
          typologies?: Json | null;
          raw?: Json;
          images?: Json | null;
          floor_plans?: Json | null;
          synced_at?: Timestamp;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
      orulo_sync_runs: {
        Row: {
          id: string;
          started_at: Timestamp;
          finished_at: Timestamp | null;
          status: string;
          pages_traversed: number | null;
          buildings_found: number | null;
          created_count: number | null;
          updated_count: number | null;
          images_fetched: number | null;
          floor_plans_fetched: number | null;
          error_summary: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          started_at?: Timestamp;
          finished_at?: Timestamp | null;
          status: string;
          pages_traversed?: number | null;
          buildings_found?: number | null;
          created_count?: number | null;
          updated_count?: number | null;
          images_fetched?: number | null;
          floor_plans_fetched?: number | null;
          error_summary?: string | null;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          started_at?: Timestamp;
          finished_at?: Timestamp | null;
          status?: string;
          pages_traversed?: number | null;
          buildings_found?: number | null;
          created_count?: number | null;
          updated_count?: number | null;
          images_fetched?: number | null;
          floor_plans_fetched?: number | null;
          error_summary?: string | null;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      property_purpose: PropertyPurpose;
      property_status: PropertyStatus;
      solar_position: SolarPosition;
    };
    CompositeTypes: Record<string, never>;
  };
};

// Atalhos utilitários de acesso às linhas/inserts/updates por tabela.
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
