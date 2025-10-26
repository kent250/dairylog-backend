CREATE TABLE "milk_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "milk_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"liters" numeric(10, 2) NOT NULL,
	"farmer_id" integer NOT NULL,
	"recorded_by_collection_id" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milk_records" ADD CONSTRAINT "milk_records_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milk_records" ADD CONSTRAINT "milk_records_recorded_by_collection_id_users_id_fk" FOREIGN KEY ("recorded_by_collection_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;