CREATE TABLE "farmers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "farmers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"farmer_name" varchar(200) NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"sector" varchar(100) NOT NULL,
	"cell" varchar(100),
	"village" varchar(100),
	"collection_center_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "farmers_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_collection_center_id_users_id_fk" FOREIGN KEY ("collection_center_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;