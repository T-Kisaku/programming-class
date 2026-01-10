<svelte:head>
  <title>TK Programming Class</title>
</svelte:head>

<main class="landing">
  <div class="card">
    <p class="eyebrow">TK Programming Class</p>
    <h1>レベルに挑戦しよう</h1>
    <p class="lead">スタートボタンからレベル4をプレイできます。</p>
    <a class="start" href="/level/4">Start</a>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: radial-gradient(circle at top, #1f2937, #0f172a);
    color: #f8fafc;
  }

  .landing {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem;
  }

  .card {
    background: rgba(15, 23, 42, 0.8);
    padding: 3rem 3.5rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.3em;
    font-size: 0.8rem;
    color: #94a3b8;
    margin: 0 0 0.75rem;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
  }

  .lead {
    margin: 0 0 2rem;
    color: #cbd5f5;
  }

  .start {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 2.5rem;
    border-radius: 999px;
    background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
    text-decoration: none;
    font-size: 1.1rem;
  }
</style>
