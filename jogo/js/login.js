// Tela de login: aparece antes do "Começar" se não houver sessão salva
// Cria 2 abas (Entrar / Criar conta), valida nome+senha, autentica e libera o jogo

function inicializarLogin() {
  carregarSessaoSalva();

  if (window.session) {
    // Ja logado — pula tela de login direto pra tela inicial
    document.getElementById('tela-login').classList.add('oculto');
    return;
  }

  // Mostra tela de login e esconde tela inicial até autenticar
  document.getElementById('tela-login').classList.remove('oculto');
  document.getElementById('tela-inicial').classList.add('aguardando-login');

  conectarFormularioLogin();
}

function conectarFormularioLogin() {
  var abaEntrar = document.getElementById('aba-entrar');
  var abaCriar = document.getElementById('aba-criar');
  var btnEntrar = document.getElementById('btn-login-entrar');
  var btnCriar = document.getElementById('btn-login-criar');
  var msgErro = document.getElementById('login-erro');

  function mostrarErro(txt) {
    msgErro.textContent = txt;
    msgErro.classList.add('visivel');
  }
  function limparErro() {
    msgErro.classList.remove('visivel');
  }

  abaEntrar.addEventListener('click', function() {
    abaEntrar.classList.add('ativa');
    abaCriar.classList.remove('ativa');
    document.getElementById('form-entrar').classList.remove('oculto');
    document.getElementById('form-criar').classList.add('oculto');
    limparErro();
  });
  abaCriar.addEventListener('click', function() {
    abaCriar.classList.add('ativa');
    abaEntrar.classList.remove('ativa');
    document.getElementById('form-criar').classList.remove('oculto');
    document.getElementById('form-entrar').classList.add('oculto');
    limparErro();
  });

  async function autenticar(rota, nome, senha) {
    btnEntrar.disabled = true;
    btnCriar.disabled = true;
    limparErro();
    try {
      var resp = await rota(nome, senha);
      salvarSessao(resp.token, resp.player);
      document.getElementById('tela-login').classList.add('oculto');
      document.getElementById('tela-inicial').classList.remove('aguardando-login');
    } catch (e) {
      mostrarErro(e.message || 'Erro ao autenticar');
    } finally {
      btnEntrar.disabled = false;
      btnCriar.disabled = false;
    }
  }

  btnEntrar.addEventListener('click', function() {
    var nome = document.getElementById('login-nome-entrar').value.trim();
    var senha = document.getElementById('login-senha-entrar').value;
    autenticar(apiLogin, nome, senha);
  });
  btnCriar.addEventListener('click', function() {
    var nome = document.getElementById('login-nome-criar').value.trim();
    var senha = document.getElementById('login-senha-criar').value;
    autenticar(apiRegistrar, nome, senha);
  });

  // Enter dentro do form aciona o botão correspondente
  document.getElementById('form-entrar').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') btnEntrar.click();
  });
  document.getElementById('form-criar').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') btnCriar.click();
  });
}
