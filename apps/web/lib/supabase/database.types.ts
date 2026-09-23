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
      patient_measurements: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          actor_user_id: string;
          metric: string;
          measure_label: string;
          measure_value: number;
          measure_unit: string;
          reported_on: string;
          client_request_id: string;
          submitted_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      patient_meal_logs: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          actor_user_id: string;
          meal_type: string;
          eaten_at: string;
          description: string | null;
          client_request_id: string;
          photo_document_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "patient_meal_logs_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "patient_meal_logs_photo_document_fkey";
            columns: ["tenant_id", "photo_document_id"];
            isOneToOne: false;
            referencedRelation: "patient_documents";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "patient_meal_logs_tenant_id_actor_user_id_fkey";
            columns: ["tenant_id", "actor_user_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
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
      care_reports: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          doctor_id: string;
          doctor_display_name: string;
          period_start: string;
          period_end: string;
          title: string;
          summary: string;
          consultation_points: string;
          status: string;
          version: number;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_report_publications: {
        Row: {
          id: string;
          tenant_id: string;
          report_id: string;
          patient_id: string;
          doctor_id: string;
          source_version: number;
          patient_title: string;
          patient_summary: string;
          period_start: string;
          period_end: string;
          clinic_display_name: string;
          patient_display_name: string;
          doctor_display_name: string;
          approved_at: string;
          published_by: string;
          published_at: string;
          status: string;
          closed_at: string | null;
          closed_by: string | null;
          withdrawal_reason: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_report_export_events: {
        Row: {
          id: string;
          tenant_id: string;
          publication_id: string;
          patient_id: string;
          requested_by: string;
          requested_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_report_sources: {
        Row: {
          id: string;
          tenant_id: string;
          report_id: string;
          patient_id: string;
          source_type: string;
          source_id: string;
          source_label: string;
          source_occurred_at: string;
          included_by: string;
          included_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_report_versions: {
        Row: {
          id: string;
          tenant_id: string;
          report_id: string;
          version: number;
          status: string;
          title: string;
          summary: string;
          consultation_points: string;
          period_start: string;
          period_end: string;
          sources: Json;
          approved_at: string | null;
          actor_user_id: string;
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
      patient_intake_contexts: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          questionnaire_version: string;
          status: string;
          reason_text: string;
          expected_outcome: string;
          first_priority: string;
          source: string;
          recorded_by: string;
          recorded_by_name: string;
          version: number;
          expected_version: number | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          status?: string;
          reason_text?: string;
          expected_outcome?: string;
          first_priority?: string;
          expected_version: number;
        };
        Relationships: [
          {
            foreignKeyName: "patient_intake_contexts_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: true;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "patient_intake_contexts_tenant_id_recorded_by_fkey";
            columns: ["tenant_id", "recorded_by"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      patient_intake_context_versions: {
        Row: {
          id: string;
          tenant_id: string;
          intake_id: string;
          patient_id: string;
          questionnaire_version: string;
          status: string;
          reason_text: string;
          expected_outcome: string;
          first_priority: string;
          source: string;
          recorded_by: string;
          recorded_by_name: string;
          version: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      care_conversations: {
        Row: {
          created_at: string;
          doctor_id: string;
          id: string;
          last_message_at: string;
          last_sender_id: string | null;
          patient_id: string;
          tenant_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "care_conversations_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "care_conversations_tenant_id_doctor_id_fkey";
            columns: ["tenant_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
          {
            foreignKeyName: "care_conversations_tenant_id_last_sender_id_fkey";
            columns: ["tenant_id", "last_sender_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      care_conversation_reads: {
        Row: {
          id: string;
          tenant_id: string;
          conversation_id: string;
          patient_id: string;
          doctor_id: string;
          reader_id: string;
          last_read_message_id: string;
          last_read_sent_at: string;
          last_read_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "care_conversation_reads_tenant_id_conversation_id_patient_id_doctor_id_fkey";
            columns: ["tenant_id", "conversation_id", "patient_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "care_conversations";
            referencedColumns: ["tenant_id", "id", "patient_id", "doctor_id"];
          },
          {
            foreignKeyName: "care_conversation_reads_tenant_id_reader_id_fkey";
            columns: ["tenant_id", "reader_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
          {
            foreignKeyName: "care_conversation_reads_tenant_id_last_read_message_id_conversation_id_patient_id_doctor_id_fkey";
            columns: ["tenant_id", "last_read_message_id", "conversation_id", "patient_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "care_messages";
            referencedColumns: ["tenant_id", "id", "conversation_id", "patient_id", "doctor_id"];
          },
        ];
      };
      patient_check_in_settings: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          frequency_days: number;
          application_enabled: boolean;
          updated_by: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      patient_daily_check_ins: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          actor_user_id: string;
          client_request_id: string;
          check_in_on: string;
          submitted_at: string;
          weight_kg: number | null;
          feeling: number | null;
          effects: Record<string, string>;
          no_effects: boolean;
          hunger: number | null;
          satiety: number | null;
          energy: number | null;
          sleep: number | null;
          water_glasses: number | null;
          adherence: string | null;
          adherence_reason: string | null;
          application_on: string | null;
          application_time: string | null;
          application_site: string | null;
          application_side: string | null;
          note: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      patient_reminder_preferences: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          patient_id: string;
          reminder_enabled: boolean;
          reminder_time: string;
          onboarded_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      patient_item_reads: {
        Row: {
          tenant_id: string;
          user_id: string;
          item_kind: string;
          item_id: string;
          patient_id: string;
          read_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "patient_item_reads_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "patient_item_reads_tenant_id_user_id_fkey";
            columns: ["tenant_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      care_messages: {
        Row: {
          client_request_id: string;
          content: string;
          conversation_id: string;
          doctor_id: string;
          id: string;
          patient_id: string;
          reference_id: string | null;
          reference_type: string | null;
          sender_id: string;
          sent_at: string;
          tenant_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName:
              "care_messages_tenant_id_conversation_id_patient_id_doctor__fkey";
            columns: ["tenant_id", "conversation_id", "patient_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "care_conversations";
            referencedColumns: ["tenant_id", "id", "patient_id", "doctor_id"];
          },
          {
            foreignKeyName: "care_messages_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "care_messages_tenant_id_doctor_id_fkey";
            columns: ["tenant_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
          {
            foreignKeyName: "care_messages_tenant_id_sender_id_fkey";
            columns: ["tenant_id", "sender_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      in_app_notifications: {
        Row: {
          created_at: string;
          event_key: string;
          id: string;
          kind: string;
          read_at: string | null;
          recipient_user_id: string;
          target_path: string;
          tenant_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName:
              "in_app_notifications_tenant_id_recipient_user_id_fkey";
            columns: ["tenant_id", "recipient_user_id"];
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
      notification_preferences: {
        Row: {
          id: string;
          in_app_enabled: boolean;
          tenant_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName:
              "notification_preferences_tenant_id_user_id_fkey";
            columns: ["tenant_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      processing_jobs: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          job_type: string;
          idempotency_key: string;
          status: string;
          attempt_count: number;
          max_attempts: number;
          available_at: string;
          last_started_at: string | null;
          lease_token: string | null;
          lease_expires_at: string | null;
          last_error_code: string | null;
          completed_at: string | null;
          failed_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "processing_jobs_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "processing_jobs_tenant_id_created_by_fkey";
            columns: ["tenant_id", "created_by"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
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
      patient_documents: {
        Row: {
          attached_to: string;
          available_at: string | null;
          byte_size: number;
          category: string;
          content_type: string;
          created_at: string;
          id: string;
          original_filename: string;
          patient_id: string;
          rejected_at: string | null;
          status: string;
          storage_path: string;
          tenant_id: string;
          uploaded_by: string;
          visibility: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "patient_documents_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "patient_documents_tenant_id_uploaded_by_fkey";
            columns: ["tenant_id", "uploaded_by"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      patient_document_reviews: {
        Row: {
          id: string;
          tenant_id: string;
          document_id: string;
          patient_id: string;
          reviewer_id: string;
          decision: string;
          internal_note: string;
          reviewed_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "patient_document_reviews_tenant_id_document_id_patient_id_fkey";
            columns: ["tenant_id", "document_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patient_documents";
            referencedColumns: ["tenant_id", "id", "patient_id"];
          },
          {
            foreignKeyName: "patient_document_reviews_tenant_id_reviewer_id_fkey";
            columns: ["tenant_id", "reviewer_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      patient_invitations: {
        Row: {
          id: string; tenant_id: string; display_name: string; channel: string;
          recipient_email: string | null; recipient_phone: string | null;
          token_hash: string | null; doctor_id: string; invited_by: string;
          status: string; delivery_status: string; expires_at: string;
          version: number;
          claimed_at: string | null; accepted_at: string | null;
          accepted_by: string | null; patient_id: string | null;
          target_patient_id: string | null;
          created_at: string; updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      patient_onboarding: {
        Row: {
          tenant_id: string; patient_id: string; user_id: string;
          status: string; current_step: string; skipped_steps: string[];
          questionnaire_version: string;
          exam_document_ids: string[]; photo_document_id: string | null;
          birth_date: string | null; weight_kg: number | null;
          height_cm: number | null; waist_cm: number | null;
          measured_on: string | null; answer_goal: string;
          answer_history: string; answer_routine: string;
          answer_treatments: string; answer_questions: string;
          share_consent: boolean; version: number;
          expected_version: number | null; submitted_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: never;
        Update: {
          current_step?: string; skipped_steps?: string[];
          exam_document_ids?: string[]; photo_document_id?: string | null;
          birth_date?: string | null; weight_kg?: number | null;
          height_cm?: number | null; waist_cm?: number | null;
          measured_on?: string | null; answer_goal?: string;
          answer_history?: string; answer_routine?: string;
          answer_treatments?: string; answer_questions?: string;
          share_consent?: boolean; expected_version: number;
        };
        Relationships: [];
      };
      patient_onboarding_submissions: {
        Row: {
          id: string; tenant_id: string; patient_id: string; user_id: string;
          source_version: number; current_step: string; skipped_steps: string[];
          questionnaire_version: string;
          exam_document_ids: string[]; photo_document_id: string | null;
          birth_date: string | null; weight_kg: number | null;
          height_cm: number | null; waist_cm: number | null;
          measured_on: string | null; answer_goal: string;
          answer_history: string; answer_routine: string;
          answer_treatments: string; answer_questions: string;
          share_consent: boolean; submitted_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      return_preparation_questionnaires: {
        Row: {
          version: number;
          title: string;
          questions: Json;
          created_at: string;
          tenant_id: string | null;
          doctor_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      return_preparation_requests: {
        Row: {
          id: string;
          tenant_id: string;
          appointment_id: string;
          patient_id: string;
          doctor_id: string;
          questionnaire_version: number;
          request_number: number;
          supplied_questions: Json | null;
          status: string;
          version: number;
          requested_by: string;
          client_request_id: string;
          requested_at: string;
          draft_updated_at: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "return_preparation_requests_tenant_id_appointment_id_fkey";
            columns: ["tenant_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "return_preparation_requests_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      return_preparation_drafts: {
        Row: {
          id: string;
          request_id: string;
          tenant_id: string;
          patient_id: string;
          actor_user_id: string;
          answers: Json;
          priorities: string[];
          version: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      return_preparation_submissions: {
        Row: {
          id: string;
          tenant_id: string;
          request_id: string;
          patient_id: string;
          doctor_id: string;
          actor_user_id: string;
          questionnaire_version: number;
          answers: Json;
          priorities: string[];
          submitted_draft_version: number | null;
          submitted_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      return_preparation_reviews: {
        Row: {
          id: string;
          tenant_id: string;
          request_id: string;
          patient_id: string;
          doctor_id: string;
          reviewer_id: string;
          note: string;
          reviewed_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
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
      patient_care_requests: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          doctor_id: string;
          kind: string;
          status: string;
          note: string;
          client_request_id: string;
          requested_at: string;
          completed_at: string | null;
          cancelled_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "patient_care_requests_tenant_id_patient_id_fkey";
            columns: ["tenant_id", "patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "patient_care_requests_tenant_id_doctor_id_fkey";
            columns: ["tenant_id", "doctor_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_patient_for_care: {
        Args: {
          target_tenant: string;
          supplied_name: string;
          supplied_birth_date: string | null;
          begin_intake: boolean;
        };
        Returns: {
          id: string;
          display_name: string;
          birth_date: string | null;
          created_at: string;
        }[];
      };
      request_return_preparation: {
        Args: {
          target_tenant: string;
          target_appointment: string;
          request_key: string;
          supplied_questions?: Json;
        };
        Returns: string;
      };
      start_required_preconsultation: {
        Args: {
          target_tenant: string;
        };
        Returns: string;
      };
      record_patient_meal: {
        Args: {
          target_tenant: string;
          request_key: string;
          type_text: string;
          happened_at: string;
          note_text: string | null;
          photo_document?: string | null;
        };
        Returns: string;
      };
      save_return_preparation_draft: {
        Args: {
          target_tenant: string;
          target_request: string;
          read_version: number;
          supplied_answers: Json;
          supplied_priorities?: string[];
        };
        Returns: number;
      };
      submit_return_preparation: {
        Args: {
          target_tenant: string;
          target_request: string;
          read_version: number;
          supplied_answers: Json;
          supplied_priorities?: string[];
          confirmed: boolean;
        };
        Returns: string;
      };
      review_return_preparation: {
        Args: {
          target_tenant: string;
          target_request: string;
          read_version: number;
          note_text: string;
          confirmed: boolean;
        };
        Returns: string;
      };
      create_care_report: {
        Args: {
          target_tenant: string;
          target_patient: string;
          report_period_start: string;
          report_period_end: string;
        };
        Returns: string;
      };
      save_care_report: {
        Args: {
          target_tenant: string;
          target_report: string;
          read_version: number;
          report_title: string;
          report_summary: string;
          report_consultation_points: string;
          report_status: string;
          source_refs: Json;
        };
        Returns: string;
      };
      approve_care_report: {
        Args: {
          target_tenant: string;
          target_report: string;
          read_version: number;
          confirmed: boolean;
        };
        Returns: string;
      };
      publish_care_report: {
        Args: {
          target_tenant: string;
          target_report: string;
          read_version: number;
          previous_publication: string | null;
          public_title: string;
          public_summary: string;
          confirmed: boolean;
        };
        Returns: string;
      };
      withdraw_care_report: {
        Args: {
          target_tenant: string;
          target_report: string;
          target_publication: string;
          reason: string;
          confirmed: boolean;
        };
        Returns: string;
      };
      reopen_care_report: {
        Args: {
          target_tenant: string;
          target_report: string;
          read_version: number;
          confirmed: boolean;
        };
        Returns: string;
      };
      authorize_care_report_export: {
        Args: {
          target_tenant: string;
          target_publication: string;
        };
        Returns: Database["public"]["Tables"]["care_report_publications"]["Row"][];
      };
      list_my_patient_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string; tenant_id: string; clinic_name: string;
          display_name: string; status: string; expires_at: string;
          created_at: string;
        }[];
      };
      accept_patient_invitation: {
        Args: { target_invitation: string; explicit_accept: boolean };
        Returns: {
          invitation_id: string; tenant_id: string; patient_id: string;
          onboarding_version: number;
        }[];
      };
      patient_intake_invitation_available: {
        Args: { target_tenant: string; target_patient: string };
        Returns: boolean;
      };
      submit_patient_onboarding: {
        Args: { target_tenant: string; read_version: number; explicit_share_consent: boolean };
        Returns: number;
      };
      get_my_patient_onboarding_context: {
        Args: { target_tenant: string };
        Returns: { clinic_name: string; doctor_name: string }[];
      };
      list_clinic_patient_invitations: {
        Args: { target_tenant: string };
        Returns: {
          id: string; display_name: string; channel: string; status: string;
          doctor_id: string; delivery_status: string; expires_at: string;
          created_at: string;
        }[];
      };
      revoke_patient_invitation: {
        Args: { target_tenant: string; target_invitation: string };
        Returns: boolean;
      };
      mark_in_app_notification_read: {
        Args: {
          target_tenant: string;
          target_notification: string;
        };
        Returns: string;
      };
      set_in_app_notification_preference: {
        Args: {
          target_tenant: string;
          enabled: boolean;
        };
        Returns: boolean;
      };
      claim_next_processing_job: {
        Args: Record<PropertyKey, never>;
        Returns: {
          job_id: string;
          tenant_id: string;
          patient_id: string;
          job_type: string;
          attempt_count: number;
          max_attempts: number;
          lease_token: string;
        }[];
      };
      recover_expired_processing_jobs: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      complete_processing_job: {
        Args: { target_job: string; target_lease: string };
        Returns: boolean;
      };
      fail_processing_job: {
        Args: {
          target_job: string;
          target_lease: string;
          failure_code: string;
        };
        Returns: { status: string; available_at: string }[];
      };
      send_direct_message: {
        Args: {
          target_tenant: string;
          target_patient: string;
          target_doctor: string;
          message_text: string;
          request_key: string;
          message_reference_type?: string | null;
          message_reference_id?: string | null;
        };
        Returns: {
          conversation_id: string;
          message_id: string;
          sent_at: string;
        }[];
      };
      mark_direct_messages_read: {
        Args: {
          target_tenant: string;
          target_patient: string;
          target_doctor: string;
          target_message: string;
        };
        Returns: string;
      };
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
      submit_patient_measurements: {
        Args: {
          target_tenant: string;
          weight_kg: number | null;
          height_cm: number | null;
          waist_cm: number | null;
          measured_on: string;
          request_id: string;
          confirmed: boolean;
        };
        Returns: number;
      };
      reserve_patient_document: {
        Args: {
          target_tenant: string;
          target_patient: string;
          target_uploader: string;
          input_filename: string;
          input_content_type: string;
          input_byte_size: number;
          input_category: string;
          input_visibility: string;
        };
        Returns: {
          document_id: string;
          storage_path: string;
        }[];
      };
      complete_patient_document: {
        Args: {
          target_tenant: string;
          target_document: string;
          target_actor: string;
        };
        Returns: string;
      };
      reject_patient_document: {
        Args: {
          target_tenant: string;
          target_document: string;
          target_actor: string;
        };
        Returns: string;
      };
      review_patient_document: {
        Args: {
          target_tenant: string;
          target_document: string;
          review_decision: string;
          internal_note: string;
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
      submit_daily_check_in: {
        Args: {
          target_tenant: string;
          request_key: string;
          answers: Record<string, unknown>;
        };
        Returns: string;
      };
      set_check_in_settings: {
        Args: {
          target_tenant: string;
          target_patient: string;
          frequency: number;
          application: boolean;
        };
        Returns: undefined;
      };
      save_reminder_preference: {
        Args: { target_tenant: string; enabled: boolean; at_time: string };
        Returns: undefined;
      };
      save_push_subscription: {
        Args: { target_tenant: string; push_endpoint: string; push_p256dh: string; push_auth: string };
        Returns: undefined;
      };
      delete_push_subscription: {
        Args: { push_endpoint: string };
        Returns: undefined;
      };
      claim_due_reminders: {
        Args: { cron_secret: string };
        Returns: { tenant_id: string; endpoint: string; p256dh: string; auth_secret: string }[];
      };
      drop_push_subscription: {
        Args: { cron_secret: string; push_endpoint: string };
        Returns: undefined;
      };
      mark_patient_item_read: {
        Args: {
          target_tenant: string;
          target_kind: string;
          target_item: string;
        };
        Returns: undefined;
      };
      request_patient_care: {
        Args: {
          target_tenant: string;
          target_patient: string;
          target_kind: string;
          request_note: string;
          request_key: string;
          replace_pending?: boolean;
        };
        Returns: string;
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
