<script lang="ts">
  import { goto } from "$app/navigation";
</script>

<main class="page">
  <div class="content">
    <h1 class="title">レベルが見つかりません</h1>
    <p class="description">申し訳ありませんが、指定されたレベルはまだ作成されていません。</p>
    <button type="button" class="back-btn" on:click={() => goto("/")}>ホームに戻る</button>
  </div>
</main>

<style>
  .page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: #f7f6f3;
  }

  .content {
    text-align: center;
    background: #ffffff;
    padding: 3rem 4rem;
    border-radius: 24px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.1);
    max-width: 500px;
  }

  .title {
    margin: 0 0 1rem;
    font-size: 2rem;
    color: #1e293b;
    font-weight: 700;
  }

  .description {
    margin: 0 0 2rem;
    font-size: 1.1rem;
    color: #64748b;
    line-height: 1.6;
  }

  .back-btn {
    border: none;
    border-radius: 999px;
    padding: 1rem 2rem;
    background: #1f6feb;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
    transition: background 0.2s;
  }

  .back-btn:hover {
    background: #1a5fd8;
  }
</style>
