// Dependências necessárias
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(require('mysql2'));
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();

// Configuração do app
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do banco de dados
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DBNAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Teste de conexão com o banco
db.getConnection()
  .then(() => console.log('Conexão com o banco estabelecida.'))
  .catch(err => console.error('Falha na conexão com o banco:', err));

// Configuração da sessão
const sessionStore = new MySQLStore(db);
app.use(session({
  key: 'sessao_usuario',
  secret: 'as-tapadas',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));

// Middleware de autenticação
function authMiddleware(req, res, next) {
  if (!req.session.loggedin) return res.redirect('/login.html');
  next();
}

// Configuração do multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rotas da aplicação

// Página inicial (login)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Cadastro de usuário
app.post('/cadastro', async (req, res) => {
  const { rm, turma, prim_nome, ult_nome, email, senha, confirm_senha } = req.body;
  if (senha !== confirm_senha) return res.status(400).send('As senhas não coincidem!');

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);
    if (rows.length > 0) return res.status(400).send('Usuário já cadastrado!');

    const hashedPassword = await bcrypt.hash(senha, 10);
    const result = await db.query(
      'INSERT INTO usuarios (rm, turma, prim_nome, ult_nome, email, senha) VALUES (?, ?, ?, ?, ?, ?)',
      [rm, turma, prim_nome, ult_nome, email, hashedPassword]
    );
    res.status(200).send('Usuário cadastrado com sucesso!');
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err.message);
    res.status(500).send('Erro no servidor!');
  }
});

// Login
app.post('/login', async (req, res) => {
  const { rm, senha } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);
    if (rows.length === 0) return res.status(400).send('Usuário não encontrado!');

    const usuario = rows[0];
    const match = await bcrypt.compare(senha, usuario.senha);
    if (!match) return res.status(400).send('Senha incorreta!');

    req.session.loggedin = true;
    req.session.firstName = usuario.prim_nome;
    req.session.rm = usuario.rm;
    req.session.save(err => {
      if (err) return res.status(500).send('Erro ao salvar a sessão!');
      res.redirect('/telainicial.html');
    });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).send('Erro no servidor!');
  }
});

// Tela inicial
app.get('/telainicial.html', (req, res) => {
  if (req.session.loggedin) res.sendFile(path.join(__dirname, 'public', 'telainicial.html'));
  else res.redirect('/login.html');
});

// Perfil do usuário
app.get('/perfil', authMiddleware, (req, res) => {
  const rm = req.session.rm;
  const query = 'SELECT rm, nome_completo, turma, email, imagem_perfil FROM usuarios WHERE rm = ?';

  db.query(query, [rm], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar os dados do usuário' });
    if (results.length > 0) {
      const user = results[0];
      const imagemBase64 = user.imagem_perfil ? user.imagem_perfil.toString('base64') : null;
      res.json({
        rm: user.rm,
        nome_completo: user.nome_completo,
        turma: user.turma,
        email: user.email,
        imagem_perfil: imagemBase64,
      });
    } else {
      res.status(404).json({ error: 'Usuário não encontrado' });
    }
  });
});

// Upload de imagem de perfil
app.post('/upload', upload.single('file'), async (req, res) => {
  const imagem = req.file.buffer;
  const rm = req.session.rm;

  try {
    await db.query('UPDATE usuarios SET imagem_perfil = ? WHERE rm = ?', [imagem, rm]);
    res.json({ message: 'Imagem salva com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar a imagem:', err);
    res.status(500).json({ message: 'Erro ao salvar a imagem.' });
  }
});

// Adicionar item ao carrinho
app.post('/adicionarCarrinho', async (req, res) => {
  const { titulo, preco, tamanho, cor, quantidade, imagem, nome_camiseta, num_camiseta } = req.body;
  const rm = req.session.rm;

  if (!rm) return res.redirect('/login.html');

  try {
    await db.query(
      `INSERT INTO carrinho (titulo, preco, tamanho, cor, quantidade, rm, imagem, nome_camiseta, num_camiseta) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo, preco, tamanho, cor, quantidade, rm, imagem, nome_camiseta, num_camiseta]
    );
    res.status(200).send('Produto adicionado ao carrinho com sucesso!');
  } catch (err) {
    console.error('Erro ao inserir produto no carrinho:', err);
    res.status(500).send('Erro ao adicionar produto ao carrinho.');
  }
});

// Visualizar carrinho
app.get('/carrinho', async (req, res) => {
  const rm = req.session.rm;

  if (!rm) return res.redirect('/login.html');

  try {
    const [results] = await db.query('SELECT * FROM carrinho WHERE rm = ?', [rm]);
    const total = results.reduce((acc, item) => acc + item.preco * item.quantidade, 0).toFixed(2);
    res.render('carrinho', { itens: results, total });
  } catch (err) {
    console.error('Erro ao buscar itens do carrinho:', err);
    res.status(500).send('Erro ao buscar itens do carrinho');
  }
});

// Outras rotas omitidas por questões de espaço...

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
