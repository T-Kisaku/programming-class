<script lang="ts">
  import { goto } from "$app/navigation";

  const levels = [
    { id: 1, title: "Level 1" },
    { id: 2, title: "Level 2" },
    { id: 3, title: "Level 3" },
    { id: 4, title: "Level 4" },
    { id: 5, title: "Level 5" },
    { id: 6, title: "Level 6" },
    { id: 7, title: "Level 7" },
    { id: 8, title: "Level 8" },
    { id: 9, title: "Level 9" },
    { id: 10, title: "Level 10" },
    { id: 11, title: "Level 11", disabled: true },
    { id: 12, title: "Level 12", disabled: true },
  ];

  const startLevel = (id: number) => {
    goto(`/level/${id}`);
  };

  const goToEditor = () => {
    goto("/editor");
  };
</script>

<main class="page">
  <div class="content">
    <h1 class="title">プログラミングゲーム</h1>
    <p class="description">
      コマンドを選択して、キャラクターを操作し、すべてのコインを集めよう！
    </p>

    <!-- レベルセレクション -->
    <div class="level-selection">
      <h2>レベルを選択</h2>
      <div class="level-grid">
        {#each levels as level}
          {@const isAvailable = !level.disabled}
          <button
            type="button"
            class={`level-btn ${isAvailable ? "available" : "disabled"}`}
            disabled={!isAvailable}
            on:click={() => startLevel(level.id)}
          >
            <span class="level-number">{level.id}</span>
            <span class="level-title">{level.title}</span>
            {#if !isAvailable}
              <span class="lock-icon">🔒</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- カスタムマップ -->
    <div class="custom-maps">
      <h2>カスタムマップ</h2>
      <div class="custom-buttons">
        <button type="button" class="custom-btn editor" on:click={goToEditor}>
          <span class="btn-icon">✏️</span>
          <span>マップを作る</span>
        </button>
      </div>
    </div>
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
    padding: 2.5rem 3rem;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 800px;
  }

  .title {
    margin: 0 0 0.5rem;
    font-size: 2.5rem;
    color: #1e293b;
    font-weight: 800;
  }

  .description {
    margin: 0 0 2rem;
    font-size: 1.1rem;
    color: #64748b;
    line-height: 1.6;
  }

  .level-selection {
    margin-bottom: 2rem;
  }

  .level-selection h2,
  .custom-maps h2 {
    margin: 0 0 1rem;
    font-size: 1.3rem;
    color: #1e293b;
  }

  .level-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .level-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem 1rem;
    border: 3px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    position: relative;
  }

  .level-btn.available:hover {
    border-color: #3b82f6;
    background: #dbeafe;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .level-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f1f5f9;
  }

  .level-number {
    font-size: 2rem;
    font-weight: 800;
    color: #475569;
  }

  .level-btn.available:hover .level-number {
    color: #1d4ed8;
  }

  .level-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #64748b;
  }

  .lock-icon {
    font-size: 1.2rem;
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
  }

  .custom-maps {
    border-top: 2px solid #e2e8f0;
    padding-top: 2rem;
  }

  .custom-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .custom-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    border-radius: 999px;
    padding: 0.8rem 1.5rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .custom-btn.editor {
    background: #10b981;
    color: #fff;
  }

  .custom-btn.editor:hover {
    background: #059669;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .btn-icon {
    font-size: 1.2rem;
  }

  @media (max-width: 600px) {
    .content {
      padding: 1.5rem;
    }

    .level-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .custom-buttons {
      flex-direction: column;
    }
  }
</style>
