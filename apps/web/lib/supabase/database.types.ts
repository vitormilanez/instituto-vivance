export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type CarePlanContent = {
  title: string;
  goals: string;
  actions: string;
  frequency: string;
  period: string;
  review_on: string | null;
  status: string;
};
type CarePlanRow = CarePlanContent & {
  id: string;
  tenant_id: string;
  patient_id: string;
  encounter_id: string | null;
  doctor_id: string;
  doctor_display_name: string;
  revision: number;
  version: number;
  expected_version: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      care_check_ins: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          prompt: string;
          due_on: string | null;
          status: string;
          requested_by: string;
          requested_at: string;
          submitted_at: string | null;
          reviewed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "care_check_ins_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      care_check_in_submissions: {
        Row: {
          id: string;
          tenant_id: string;
          check_in_id: string;
          patient_id: string;
          actor_user_id: string;
          report: string;
          measure_label: string | null;
          measure_value: number | null;
          measure_unit: string | null;
          reported_on: string;
          submitted_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_check_in_reviews: {
        Row: {
          id: string;
          tenant_id: string;
          check_in_id: string;
          patient_id: string;
          reviewer_id: string;
          note: string;
          reviewed_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_plan_publications: {
        Row: CarePlanContent & {
          id: string;
          tenant_id: string;
          plan_id: string;
          patient_id: string;
          source_version: number;
          revision: number;
          review_on: string;
          doctor_display_name: string;
          approved_at: string;
          published_by: string;
          published_at: string;
          closed_at: string | null;
          closed_by: string | null;
          withdrawal_reason: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_plan_receipts: {
        Row: {
          id: string;
          tenant_id: string;
          publication_id: string;
          patient_id: string;
          actor_user_id: string;
          acknowledged_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "care_plan_receipts_tenant_id_publication_id_patient_id_fkey";
            columns: ["tenant_id", "publication_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "care_plan_publications";
            referencedColumns: ["tenant_id", "id", "patient_id"];
          },
        ];
      };
      care_plans: {
        Row: CarePlanRow;
        Insert: {
          tenant_id: string;
          patient_id: string;
          encounter_id?: string | null;
        };
        Update: Partial<CarePlanContent> & { expected_version: number };
        Relationships: [
          {
            foreignKeyName: "care_plans_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      care_plan_versions: {
        Row: CarePlanContent & {
          id: string;
          tenant_id: string;
          plan_id: string;
          version: number;
          revision: number;
          actor_user_id: string;
          approved_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      encounter_addenda: {
        Row: {
          id: string;
          tenant_id: string;
          encounter_id: string;
          encounter_version: number;
          addendum_number: number;
          reason: string;
          content: string;
          actor_user_id: string;
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          encounter_id: string;
          encounter_version: number;
          reason: string;
          content: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "encounter_addenda_tenant_id_encounter_id_fkey";
            columns: ["tenant_id", "encounter_id"];
            isOneToOne: false;
            referencedRelation: "encounters";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "encounter_addenda_tenant_id_actor_user_id_fkey";
            columns: ["tenant_id", "actor_user_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      encounters: {
        Row: {
          id: string;
          tenant_id: string;
          appointment_id: string;
          patient_id: string;
          doctor_id: string;
          doctor_display_name: string;
          status: string;
          reason: string;
          evolution: string;
          version: number;
          expected_version: number | null;
          created_at: string;
          updated_at: string;
          finalized_at: string | null;
        };
        Insert: {
          tenant_id: string;
          appointment_id: string;
          patient_id: string;
          doctor_id: string;
        };
        Update: {
          reason?: string;
          evolution?: string;
          status?: string;
          expected_version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "encounters_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "encounters_tenant_id_doctor_id_fkey";
            columns: ["tenant_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      encounter_versions: {
        Row: {
          id: string;
          tenant_id: string;
          encounter_id: string;
          version: number;
          status: string;
          reason: string;
          evolution: string;
          actor_user_id: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      appointment_status_events: {
        Row: {
          id: string;
          tenant_id: string;
          appointment_id: string;
          from_status: string;
          to_status: string;
          actor_user_id: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "appointment_status_events_tenant_id_appointment_id_fkey";
            columns: ["tenant_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          doctor_id: string;
          doctor_display_name: string;
          starts_at: string;
          ends_at: string;
          kind: string;
          status: string;
          version: number;
          expected_version: number | null;
          started_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          no_show_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          patient_id: string;
          doctor_id: string;
          starts_at: string;
          ends_at: string;
          kind?: string;
        };
        Update: {
          patient_id?: string;
          doctor_id?: string;
          starts_at?: string;
          ends_at?: string;
          kind?: string;
          expected_version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "appointments_tenant_id_doctor_id_fkey";
            columns: ["tenant_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      care_relationships: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string;
          expected_version: number | null;
          id: string;
          patient_id: string;
          professional_id: string;
          revoked_at: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          patient_id: string;
          professional_id: string;
          status?: string;
          tenant_id: string;
        };
        Update: {
          expected_version?: number | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "care_relationships_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "care_relationships_tenant_id_professional_id_fkey";
            columns: ["tenant_id", "professional_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_user_id: string | null;
          changed_fields: string[];
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          tenant_id: string;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          changed_fields?: string[];
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          tenant_id: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          changed_fields?: string[];
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          accepted_at: string | null;
          display_name: string | null;
          created_at: string;
          expected_version: number | null;
          role: string;
          status: string;
          tenant_id: string;
          user_id: string;
          version: number;
        };
        Insert: {
          display_name?: string | null;
          role: string;
          status?: string;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          display_name?: string | null;
          expected_version?: number | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_accounts: {
        Row: {
          created_at: string;
          id: string;
          patient_id: string;
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          patient_id: string;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          patient_id?: string;
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_accounts_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: true;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "patient_accounts_tenant_id_user_id_fkey";
            columns: ["tenant_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      patients: {
        Row: {
          birth_date: string | null;
          created_at: string;
          created_by: string;
          display_name: string;
          id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          birth_date?: string | null;
          created_at?: string;
          created_by?: string;
          display_name: string;
          id?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          birth_date?: string | null;
          created_at?: string;
          created_by?: string;
          display_name?: string;
          id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      request_care_check_in: {
        Args: {
          target_tenant: string;
          target_patient: string;
          prompt_text: string;
          due_on: string | null;
        };
        Returns: string;
      };
      submit_care_check_in: {
        Args: {
          target_tenant: string;
          target_check_in: string;
          report_text: string;
          measure_label: string | null;
          measure_value: number | null;
          measure_unit: string | null;
          reported_on: string;
          confirmed: boolean;
        };
        Returns: string;
      };
      review_care_check_in: {
        Args: {
          target_tenant: string;
          target_check_in: string;
          note_text: string;
          confirmed: boolean;
        };
        Returns: string;
      };
      publish_care_plan: {
        Args: {
          target_tenant: string;
          target_plan: string;
          read_version: number;
          previous_publication: string | null;
          confirmed: boolean;
        };
        Returns: string;
      };
      withdraw_care_plan: {
        Args: {
          target_tenant: string;
          target_plan: string;
          target_publication: string;
          reason: string;
          confirmed: boolean;
        };
        Returns: string;
      };
      acknowledge_care_plan: {
        Args: {
          target_tenant: string;
          target_publication: string;
          confirmed: boolean;
        };
        Returns: string;
      };
      list_encounters_page: {
        Args: {
          target_tenant: string;
          search_text?: string;
          before_created_at?: string | null;
          before_id?: string | null;
          page_limit?: number;
        };
        Returns: {
          id: string;
          patient_id: string;
          doctor_id: string;
          status: string;
          created_at: string;
          updated_at: string;
          patient_display_name: string;
          doctor_display_name: string;
        }[];
      };
      start_encounter: {
        Args: {
          target_tenant: string;
          target_appointment: string;
          accept_care: boolean;
          read_version: number;
        };
        Returns: string;
      };
      transition_appointment: {
        Args: {
          target_tenant: string;
          target_appointment: string;
          read_version: number;
          target_status: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
