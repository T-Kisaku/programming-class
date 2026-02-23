<script lang="ts">
  import { goto } from "$app/navigation";

  const goHome = () => {
    goto("/");
  };
</script>

<main class="page">
  <div class="content">
    <div class="icon">🎉</div>
    <h1 class="title">おめでとうございます！</h1>
    <p class="description">すべてのレベルをクリアしました！</p>
    <button type="button" class="home-btn" on:click={goHome}>ホームに戻る</button>
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .content {
    text-align: center;
    background: #ffffff;
    padding: 3rem 4rem;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
  }

  .icon {
    font-size: 5rem;
    margin-bottom: 1rem;
  }

  .title {
    margin: 0 0 1rem;
    font-size: 2.5rem;
    color: #1e293b;
    font-weight: 800;
  }

  .description {
    margin: 0 0 2rem;
    font-size: 1.2rem;
    color: #64748b;
    line-height: 1.6;
  }

  .home-btn {
    border: none;
    border-radius: 999px;
    padding: 1rem 3rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    cursor: pointer;
    font-weight: 700;
    font-size: 1.2rem;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }

  .home-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
  }

  .home-btn:active {
    transform: translateY(0);
  }
</style>
