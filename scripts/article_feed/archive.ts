import supabase from './db'

const ARCHIVE_AFTER_DAYS = 3

async function runArchive() {

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - ARCHIVE_AFTER_DAYS)

  const { data, error } = await supabase
    .from('articles')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('archived', false)
    .eq('saved', false)
    .lt('created_at', cutoff.toISOString())
    .select('id')

  if (error) {
    console.error('[archive] Failed:', error.message)
    process.exit(1)
  }

  console.log(`[archive] Archived ${data?.length ?? 0} articles`)
  console.log('[archive] Done:', new Date().toISOString())
}

runArchive().catch(err => {
  console.error('[archive] Fatal error:', err)
  process.exit(1)
})