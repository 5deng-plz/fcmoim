CREATE POLICY "Approved members can receive feed comment broadcasts"
ON "realtime"."messages"
FOR SELECT
TO "authenticated"
USING (
  "extension" = 'broadcast'
  AND EXISTS (
    SELECT 1
    FROM "public"."feed_posts" AS "fp"
    JOIN "public"."team_memberships" AS "tm"
      ON "tm"."club_id" = "fp"."club_id"
    WHERE "tm"."account_id" = (SELECT "auth"."uid"())
      AND "tm"."status" = 'approved'::"public"."membership_status"
      AND (SELECT "realtime"."topic"()) = 'comments:feed_post:' || "fp"."id"::text
  )
);
