-- Add explicit DENY policies for UPDATE and DELETE on call_history
-- These prevent any user from modifying or deleting call records

-- Policy to deny all UPDATE operations
CREATE POLICY "Deny all updates to call history"
ON public.call_history
FOR UPDATE
USING (false);

-- Policy to deny all DELETE operations  
CREATE POLICY "Deny all deletes from call history"
ON public.call_history
FOR DELETE
USING (false);