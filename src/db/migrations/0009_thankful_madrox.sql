CREATE TABLE "dead_milk_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dead_milk_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"farmer_id" integer NOT NULL,
	"recorded_by_collection_id" integer NOT NULL,
	"liters" numeric(10, 2) NOT NULL,
	"reason" varchar(200) NOT NULL,
	"notes" text,
	"recorded_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dead_milk_records" ADD CONSTRAINT "dead_milk_records_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dead_milk_records" ADD CONSTRAINT "dead_milk_records_recorded_by_collection_id_users_id_fk" FOREIGN KEY ("recorded_by_collection_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;