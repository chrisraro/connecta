export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_bootstrap_grants: {
        Row: {
          consumed_at: string | null;
          consumed_by: string | null;
          created_at: string;
          email: string;
          role: Database["public"]["Enums"]["admin_role"];
        };
        Insert: {
          consumed_at?: string | null;
          consumed_by?: string | null;
          created_at?: string;
          email: string;
          role?: Database["public"]["Enums"]["admin_role"];
        };
        Update: {
          consumed_at?: string | null;
          consumed_by?: string | null;
          created_at?: string;
          email?: string;
          role?: Database["public"]["Enums"]["admin_role"];
        };
        Relationships: [
          {
            foreignKeyName: "admin_bootstrap_grants_consumed_by_fkey";
            columns: ["consumed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      admins: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          id: string;
          reason: string | null;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          reason?: string | null;
          revoked_at?: string | null;
          role: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          reason?: string | null;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["admin_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admins_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          changes: Json | null;
          created_at: string;
          id: string;
          ip_address: string | null;
          resource_id: string;
          resource_type: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          changes?: Json | null;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          resource_id: string;
          resource_type: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          changes?: Json | null;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          resource_id?: string;
          resource_type?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cards: {
        Row: {
          activation_code: string;
          created_at: string;
          id: string;
          linked_profile_id: string | null;
          owner_id: string | null;
          skin: Database["public"]["Enums"]["card_skin"];
          status: Database["public"]["Enums"]["card_status"];
          tap_count: number;
          updated_at: string;
          uuid: string;
        };
        Insert: {
          activation_code: string;
          created_at?: string;
          id?: string;
          linked_profile_id?: string | null;
          owner_id?: string | null;
          skin?: Database["public"]["Enums"]["card_skin"];
          status?: Database["public"]["Enums"]["card_status"];
          tap_count?: number;
          updated_at?: string;
          uuid: string;
        };
        Update: {
          activation_code?: string;
          created_at?: string;
          id?: string;
          linked_profile_id?: string | null;
          owner_id?: string | null;
          skin?: Database["public"]["Enums"]["card_skin"];
          status?: Database["public"]["Enums"]["card_status"];
          tap_count?: number;
          updated_at?: string;
          uuid?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cards_linked_profile_id_fkey";
            columns: ["linked_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cards_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string;
          id: string;
          items: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          items?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          items?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          created_at: string;
          id: string;
          inquirer_contact: string;
          inquirer_name: string;
          last_contacted_at: string | null;
          message: string | null;
          owner_id: string;
          property_id: string | null;
          property_name: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          inquirer_contact: string;
          inquirer_name: string;
          last_contacted_at?: string | null;
          message?: string | null;
          owner_id: string;
          property_id?: string | null;
          property_name?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          inquirer_contact?: string;
          inquirer_name?: string;
          last_contacted_at?: string | null;
          message?: string | null;
          owner_id?: string;
          property_id?: string | null;
          property_name?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          data: Json | null;
          id: string;
          link: string | null;
          message: string;
          read: boolean;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          data?: Json | null;
          id?: string;
          link?: string | null;
          message: string;
          read?: boolean;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          data?: Json | null;
          id?: string;
          link?: string | null;
          message?: string;
          read?: boolean;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image: string | null;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image?: string | null;
          is_active?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image?: string | null;
          is_active?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variations: {
        Row: {
          created_at: string;
          id: string;
          image: string | null;
          inventory: number;
          name: string;
          options: Json;
          price: number;
          product_id: string;
          sku: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image?: string | null;
          inventory?: number;
          name: string;
          options?: Json;
          price: number;
          product_id: string;
          sku: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image?: string | null;
          inventory?: number;
          name?: string;
          options?: Json;
          price?: number;
          product_id?: string;
          sku?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          barcode: string | null;
          base_price: number;
          category_id: string | null;
          compare_at_price: number | null;
          cost_price: number | null;
          created_at: string;
          description: string | null;
          dimensions: Json | null;
          id: string;
          images: string[];
          inventory: number;
          is_featured: boolean;
          is_published: boolean;
          low_stock_threshold: number;
          metadata: Json | null;
          name: string;
          primary_image_index: number;
          shipping_required: boolean;
          sku: string;
          slug: string;
          tags: string[];
          track_inventory: boolean;
          updated_at: string;
          weight: number | null;
        };
        Insert: {
          barcode?: string | null;
          base_price: number;
          category_id?: string | null;
          compare_at_price?: number | null;
          cost_price?: number | null;
          created_at?: string;
          description?: string | null;
          dimensions?: Json | null;
          id?: string;
          images?: string[];
          inventory?: number;
          is_featured?: boolean;
          is_published?: boolean;
          low_stock_threshold?: number;
          metadata?: Json | null;
          name: string;
          primary_image_index?: number;
          shipping_required?: boolean;
          sku: string;
          slug: string;
          tags?: string[];
          track_inventory?: boolean;
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          barcode?: string | null;
          base_price?: number;
          category_id?: string | null;
          compare_at_price?: number | null;
          cost_price?: number | null;
          created_at?: string;
          description?: string | null;
          dimensions?: Json | null;
          id?: string;
          images?: string[];
          inventory?: number;
          is_featured?: boolean;
          is_published?: boolean;
          low_stock_threshold?: number;
          metadata?: Json | null;
          name?: string;
          primary_image_index?: number;
          shipping_required?: boolean;
          sku?: string;
          slug?: string;
          tags?: string[];
          track_inventory?: boolean;
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_featured_properties: {
        Row: {
          position: number;
          profile_id: string;
          property_id: string;
        };
        Insert: {
          position?: number;
          profile_id: string;
          property_id: string;
        };
        Update: {
          position?: number;
          profile_id?: string;
          property_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_featured_properties_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_featured_properties_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          agent_info: Json;
          created_at: string;
          id: string;
          inline_projects: Json;
          layout_config: Json;
          name: string;
          owner_id: string;
          owner_suspended: boolean;
          products: Json;
          profile_type: Database["public"]["Enums"]["profile_type"] | null;
          property_listings: Json;
          services: Json;
          show_storefront: boolean;
          skin: Database["public"]["Enums"]["card_skin"];
          slug: string | null;
          updated_at: string;
        };
        Insert: {
          agent_info: Json;
          created_at?: string;
          id?: string;
          inline_projects?: Json;
          layout_config: Json;
          name: string;
          owner_id: string;
          owner_suspended?: boolean;
          products?: Json;
          profile_type?: Database["public"]["Enums"]["profile_type"] | null;
          property_listings?: Json;
          services?: Json;
          show_storefront?: boolean;
          skin?: Database["public"]["Enums"]["card_skin"];
          slug?: string | null;
          updated_at?: string;
        };
        Update: {
          agent_info?: Json;
          created_at?: string;
          id?: string;
          inline_projects?: Json;
          layout_config?: Json;
          name?: string;
          owner_id?: string;
          owner_suspended?: boolean;
          products?: Json;
          profile_type?: Database["public"]["Enums"]["profile_type"] | null;
          property_listings?: Json;
          services?: Json;
          show_storefront?: boolean;
          skin?: Database["public"]["Enums"]["card_skin"];
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          case_study_url: string | null;
          category: Database["public"]["Enums"]["project_category"];
          created_at: string;
          description: string | null;
          external_url: string | null;
          featured: boolean;
          id: string;
          images: string[];
          owner_id: string;
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          case_study_url?: string | null;
          category: Database["public"]["Enums"]["project_category"];
          created_at?: string;
          description?: string | null;
          external_url?: string | null;
          featured?: boolean;
          id?: string;
          images?: string[];
          owner_id: string;
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          case_study_url?: string | null;
          category?: Database["public"]["Enums"]["project_category"];
          created_at?: string;
          description?: string | null;
          external_url?: string | null;
          featured?: boolean;
          id?: string;
          images?: string[];
          owner_id?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      properties: {
        Row: {
          bathrooms: number | null;
          bedrooms: number | null;
          created_at: string;
          date_sold: string | null;
          description: string | null;
          details_url: string | null;
          floor_area: number | null;
          floors: number | null;
          id: string;
          images: string[];
          location: string | null;
          lot_area: number | null;
          owner_id: string;
          price: number;
          status: Database["public"]["Enums"]["property_status"];
          title: string;
          type: Database["public"]["Enums"]["property_type"];
          updated_at: string;
        };
        Insert: {
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          date_sold?: string | null;
          description?: string | null;
          details_url?: string | null;
          floor_area?: number | null;
          floors?: number | null;
          id?: string;
          images?: string[];
          location?: string | null;
          lot_area?: number | null;
          owner_id: string;
          price: number;
          status: Database["public"]["Enums"]["property_status"];
          title: string;
          type: Database["public"]["Enums"]["property_type"];
          updated_at?: string;
        };
        Update: {
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          date_sold?: string | null;
          description?: string | null;
          details_url?: string | null;
          floor_area?: number | null;
          floors?: number | null;
          id?: string;
          images?: string[];
          location?: string | null;
          lot_area?: number | null;
          owner_id?: string;
          price?: number;
          status?: Database["public"]["Enums"]["property_status"];
          title?: string;
          type?: Database["public"]["Enums"]["property_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          key: string;
          window_start?: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      team_invites: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          invited_by: string;
          status: Database["public"]["Enums"]["invite_status"];
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          invited_by: string;
          status?: Database["public"]["Enums"]["invite_status"];
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string;
          status?: Database["public"]["Enums"]["invite_status"];
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invites_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          accent_color: string | null;
          company_name: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          owner_id: string;
          seats: number;
          updated_at: string;
        };
        Insert: {
          accent_color?: string | null;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          seats?: number;
          updated_at?: string;
        };
        Update: {
          accent_color?: string | null;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          seats?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string | null;
          onboarding_completed: boolean;
          onboarding_data: Json | null;
          plan: Database["public"]["Enums"]["plan_tier"];
          plan_expires_at: string | null;
          role: Database["public"]["Enums"]["user_role"];
          subscription_status: string;
          team_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          name?: string | null;
          onboarding_completed?: boolean;
          onboarding_data?: Json | null;
          plan?: Database["public"]["Enums"]["plan_tier"];
          plan_expires_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          subscription_status?: string;
          team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          onboarding_completed?: boolean;
          onboarding_data?: Json | null;
          plan?: Database["public"]["Enums"]["plan_tier"];
          plan_expires_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          subscription_status?: string;
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_card_by_code: { Args: { code: string }; Returns: string };
      admin_dashboard_stats: { Args: never; Returns: Json };
      admin_delete_cards: { Args: { card_ids: string[] }; Returns: Json };
      admin_grant_role: {
        Args: {
          grant_reason?: string;
          grant_role: Database["public"]["Enums"]["admin_role"];
          target_user: string;
        };
        Returns: undefined;
      };
      admin_register_card: {
        Args: {
          card_uuid: string;
          skin?: Database["public"]["Enums"]["card_skin"];
        };
        Returns: {
          activation_code: string;
          created_at: string;
          id: string;
          linked_profile_id: string | null;
          owner_id: string | null;
          skin: Database["public"]["Enums"]["card_skin"];
          status: Database["public"]["Enums"]["card_status"];
          tap_count: number;
          updated_at: string;
          uuid: string;
        };
        SetofOptions: {
          from: "*";
          to: "cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_revoke_role: {
        Args: { revoke_reason?: string; target_user: string };
        Returns: undefined;
      };
      admin_set_user_plan: {
        Args: {
          new_plan: Database["public"]["Enums"]["plan_tier"];
          period_days?: number;
          target_user: string;
        };
        Returns: Json;
      };
      admin_set_user_suspended: {
        Args: { suspend: boolean; target_user: string };
        Returns: undefined;
      };
      assign_profile_slug_for: {
        Args: { row_in: Database["public"]["Tables"]["profiles"]["Row"] };
        Returns: {
          agent_info: Json;
          created_at: string;
          id: string;
          inline_projects: Json;
          layout_config: Json;
          name: string;
          owner_id: string;
          owner_suspended: boolean;
          products: Json;
          profile_type: Database["public"]["Enums"]["profile_type"] | null;
          property_listings: Json;
          services: Json;
          show_storefront: boolean;
          skin: Database["public"]["Enums"]["card_skin"];
          slug: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "profiles";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      bootstrap_superadmin: { Args: { target_email: string }; Returns: string };
      check_rate_limit: {
        Args: { limit_key: string; max_hits: number; window_seconds: number };
        Returns: undefined;
      };
      claim_card_by_uuid: { Args: { card_uuid: string }; Returns: string };
      current_team_id: { Args: never; Returns: string };
      delete_my_account: { Args: never; Returns: Json };
      effective_plan: {
        Args: { check_user?: string };
        Returns: Database["public"]["Enums"]["plan_tier"];
      };
      get_my_team: { Args: never; Returns: Json };
      get_public_profile: {
        Args: { lookup_id?: string; lookup_slug?: string };
        Returns: Json;
      };
      get_team_leads: { Args: never; Returns: Json };
      is_admin: { Args: { check_user?: string }; Returns: boolean };
      is_reserved_slug: { Args: { candidate: string }; Returns: boolean };
      is_superadmin: { Args: { check_user?: string }; Returns: boolean };
      is_suspended: { Args: { check_user?: string }; Returns: boolean };
      log_audit: {
        Args: {
          actor: string;
          audit_action: string;
          changes?: Json;
          resource_id: string;
          resource_type: string;
        };
        Returns: undefined;
      };
      record_card_tap: { Args: { card_uuid: string }; Returns: undefined };
      require_admin: { Args: never; Returns: string };
      require_superadmin: { Args: never; Returns: string };
      resolve_card_for_tap: {
        Args: { card_uuid: string };
        Returns: {
          id: string;
          linked_profile_id: string;
          status: Database["public"]["Enums"]["card_status"];
          uuid: string;
        }[];
      };
      save_onboarding: {
        Args: {
          about?: string;
          avatar_url?: string;
          company_name?: string;
          contact_email: string;
          full_name: string;
          job_title: string;
          mark_completed?: boolean;
          phone?: string;
          profile_category: string;
          services?: string[];
          social_links?: Json;
          website?: string;
        };
        Returns: Json;
      };
      slugify: { Args: { input: string; suffix?: string }; Returns: string };
      submit_lead: {
        Args: {
          inquirer_contact: string;
          inquirer_name: string;
          lead_owner: string;
          message?: string;
          property_id?: string;
          property_name?: string;
          self_capture?: boolean;
          visitor_key?: string;
        };
        Returns: Json;
      };
      team_accept_invite: { Args: { invite_id: string }; Returns: undefined };
      team_invite_member: { Args: { invite_email: string }; Returns: string };
      team_remove_member: { Args: { member_id: string }; Returns: undefined };
      team_revoke_invite: { Args: { invite_id: string }; Returns: undefined };
      unaccent_fallback: { Args: { input: string }; Returns: string };
      unclaim_card: { Args: { card_id: string }; Returns: undefined };
    };
    Enums: {
      admin_role: "superadmin" | "moderator";
      card_skin: "charcoal" | "scarlet" | "crimson" | "gradient";
      card_status: "inventory" | "active" | "lost";
      dimension_unit: "cm" | "in";
      invite_status: "pending" | "accepted" | "revoked";
      lead_status: "new" | "contacted" | "closed";
      notification_type: "new_lead" | "system";
      plan_tier: "free" | "pro" | "business";
      profile_type: "individual" | "company" | "business";
      project_category:
        | "graphic-design"
        | "web-design"
        | "photography"
        | "video"
        | "branding"
        | "case-study"
        | "development"
        | "ui-ux"
        | "real-estate"
        | "other";
      property_status: "for-sale" | "for-rent" | "sold";
      property_type: "lot-only" | "house-lot" | "townhouse" | "condo" | "commercial";
      user_role: "agent" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      admin_role: ["superadmin", "moderator"],
      card_skin: ["charcoal", "scarlet", "crimson", "gradient"],
      card_status: ["inventory", "active", "lost"],
      dimension_unit: ["cm", "in"],
      invite_status: ["pending", "accepted", "revoked"],
      lead_status: ["new", "contacted", "closed"],
      notification_type: ["new_lead", "system"],
      plan_tier: ["free", "pro", "business"],
      profile_type: ["individual", "company", "business"],
      project_category: [
        "graphic-design",
        "web-design",
        "photography",
        "video",
        "branding",
        "case-study",
        "development",
        "ui-ux",
        "real-estate",
        "other",
      ],
      property_status: ["for-sale", "for-rent", "sold"],
      property_type: ["lot-only", "house-lot", "townhouse", "condo", "commercial"],
      user_role: ["agent", "admin"],
    },
  },
} as const;
