// Retired: the store sells to individuals only, so there are no quote requests any more.
// Kept deployed as a stub so pages cached from before answer cleanly instead of storing anything.
Deno.serve(() => new Response(JSON.stringify({ error: 'gone' }), { status: 410, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }))
