import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('Starting price simulation...')
    
    // Get all stocks
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('*')

    if (stocksError) {
      console.error('Error fetching stocks:', stocksError)
      throw stocksError
    }

    console.log(`Found ${stocks.length} stocks to update`)

    // Update each stock with simulated price changes
    for (const stock of stocks) {
      // Generate realistic price movement (-2% to +2% change)
      const changePercent = (Math.random() - 0.5) * 0.04 // -2% to +2%
      const priceChange = stock.current_price * changePercent
      const newPrice = Math.max(0.01, stock.current_price + priceChange) // Ensure price doesn't go negative

      console.log(`Updating ${stock.symbol}: ${stock.current_price} -> ${newPrice.toFixed(2)} (${(changePercent * 100).toFixed(2)}%)`)

      // Update the stock price
      const { error: updateError } = await supabase
        .from('stocks')
        .update({ 
          previous_close: stock.current_price,
          current_price: parseFloat(newPrice.toFixed(2))
        })
        .eq('id', stock.id)

      if (updateError) {
        console.error(`Error updating ${stock.symbol}:`, updateError)
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('Price simulation completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${stocks.length} stock prices`,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Price simulation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Price simulation failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})