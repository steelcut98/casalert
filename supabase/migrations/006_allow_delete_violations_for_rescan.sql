-- Allow users to delete violations for their own properties (for full re-scan).
-- violation_reminders reference violations(id) ON DELETE CASCADE, so reminders are removed automatically.
CREATE POLICY "Users can delete violations for own properties"
  ON public.violations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = violations.property_id AND p.user_id = auth.uid()
    )
  );
