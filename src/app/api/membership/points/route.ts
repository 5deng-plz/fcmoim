import { AppError, appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/supabase-repositories';

type PointLedgerDbRow = {
  id: string;
  amount: number;
  reason: string;
  source_type: string;
  source_id: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
    );
    const snapshot = await service.bootstrapProfile({ auth, clubId });

    if (!snapshot.membership || snapshot.membership.status !== 'approved') {
      throw new AppError('forbidden', 'Only approved members can read point history.');
    }

    const { data, error } = await supabase
      .from('point_ledger')
      .select('id, amount, reason, source_type, source_id, created_at')
      .eq('membership_id', snapshot.membership.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .returns<PointLedgerDbRow[]>();

    if (error) {
      throw new AppError('internal_error', 'Failed to fetch point ledger.', { cause: error });
    }

    return Response.json((data ?? []).map((row) => ({
      id: row.id,
      amount: row.amount,
      reason: row.reason,
      sourceType: row.source_type,
      sourceId: row.source_id,
      createdAt: row.created_at,
    })));
  } catch (error) {
    return appErrorResponse(error);
  }
}
