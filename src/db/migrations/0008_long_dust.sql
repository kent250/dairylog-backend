CREATE TABLE "farmer_purchases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "farmer_purchases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"farmer_id" integer NOT NULL,
	"recorded_by_collection_id" integer NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"purchase_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farmer_purchases" ADD CONSTRAINT "farmer_purchases_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_purchases" ADD CONSTRAINT "farmer_purchases_recorded_by_collection_id_users_id_fk" FOREIGN KEY ("recorded_by_collection_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;