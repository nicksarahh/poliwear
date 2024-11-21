const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { body, validationResult } = require('express-validator'); // Para validação

const app = express();

// Configurações do app
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessão
app.use(
  session({
    secret: 'as-tapadas',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Somente cookies seguros em produção
      httpOnly: true, // Evita acesso via JavaScript
    },
  })
);

// Middleware para verificar autenticação
function authMiddleware(req, res, next) {
  if (!req.session.loggedin) {
    return res.redirect('/login.html');
  }
  next();
}

// Configuração do Multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Conexão com o banco de dados MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DBNAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Teste de conexão
db.getConnection()
  .then(() => console.log('Conexão com o banco estabelecida.'))
  .catch((err) => console.error('Falha na conexão com o banco:', err));

// Rotas

// Página de login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Cadastro de usuário
app.post(
  '/cadastro',
  [
    body('rm').isNumeric().withMessage('RM deve ser numérico.'),
    body('email').isEmail().withMessage('Email inválido.'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rm, turma, prim_nome, ult_nome, email, senha, confirm_senha } = req.body;

    if (senha !== confirm_senha) {
      return res.status(400).send('As senhas não coincidem!');
    }

    try {
      const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);

      if (rows.length > 0) {
        return res.status(400).send('Usuário já cadastrado.');
      }

      const hashedPassword = await bcrypt.hash(senha, 10);

      await db.query(
        'INSERT INTO usuarios (rm, turma, prim_nome, ult_nome, email, senha) VALUES (?, ?, ?, ?, ?, ?)',
        [rm, turma, prim_nome, ult_nome, email, hashedPassword]
      );

      return res.status(201).send('Usuário cadastrado com sucesso.');
    } catch (err) {
      console.error('Erro ao cadastrar usuário:', err);
      return res.status(500).send('Erro no servidor.');
    }
  }
);

// Login
app.post('/login', async (req, res) => {
  const { rm, senha } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);

    if (rows.length === 0) {
      return res.status(400).send('Usuário não encontrado.');
    }

    const usuario = rows[0];
    const match = await bcrypt.compare(senha, usuario.senha);

    if (!match) {
      return res.status(401).send('Senha incorreta.');
    }

    req.session.loggedin = true;
    req.session.firstName = usuario.prim_nome;
    req.session.rm = usuario.rm;

    return res.redirect('/telainicial.html');
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).send('Erro no servidor.');
  }
});

// Página inicial
app.get('/telainicial.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'telainicial.html'));
});

// Perfil do usuário
app.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT rm, turma, prim_nome, ult_nome, email, imagem_perfil FROM usuarios WHERE rm = ?',
      [req.session.rm]
    );

    if (rows.length === 0) {
      return res.status(404).send('Usuário não encontrado.');
    }

    const usuario = rows[0];
    res.json({
      rm: usuario.rm,
      nome_completo: `${usuario.prim_nome} ${usuario.ult_nome}`,
      turma: usuario.turma,
      email: usuario.email,
      imagem_perfil: usuario.imagem_perfil ? usuario.imagem_perfil.toString('base64') : null,
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).send('Erro no servidor.');
  }
});

// Upload de imagem de perfil
app.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET imagem_perfil = ? WHERE rm = ?', [req.file.buffer, req.session.rm]);
    res.status(200).json({ message: 'Imagem salva com sucesso.' });
  } catch (err) {
    console.error('Erro ao salvar imagem:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// Visualizar carrinho
app.get('/carrinho', authMiddleware, async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM carrinho WHERE rm = ?', [req.session.rm]);
    const total = results.reduce((acc, item) => acc + item.preco * item.quantidade, 0).toFixed(2);

    res.render('carrinho', { itens: results, total });
  } catch (err) {
    console.error('Erro ao buscar carrinho:', err);
    res.status(500).send('Erro no servidor.');
  }
});

// Outras rotas permanecem similares...

app.post('/remover-produto', async (req, res) => {
  const produtoId = req.body.produto_id;

  try {
    const [result] = await db.query('DELETE FROM carrinho WHERE id = ?', [produtoId]);

    if (result.affectedRows === 0) {
      console.log('Produto não encontrado no carrinho!');
    }

    console.log('Produto excluído com sucesso:', produtoId);
    res.redirect('/carrinho'); // Redireciona para a página do carrinho após a exclusão
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    return res.status(500).send('Erro no servidor!');
  }
});


app.post('/concluirPedido', async (req, res) => {
  const rm = req.session.rm;  // Supondo que o RM do usuário esteja na sessão

  if (!rm) {
    return res.redirect('/login.html')
  }

  try {
    // Inserir os pedidos na tabela pedidos primeiro
    const inserirPedidosQuery = `
      INSERT INTO pedidos (rm, titulo, preco, tamanho, cor, quantidade, imagem)
      SELECT rm, titulo, preco, tamanho, cor, quantidade, imagem
      FROM carrinho
      WHERE rm = ?`;

    console.log('Inserindo pedidos para RM:', rm);

    // Executando a inserção com await
    await db.execute(inserirPedidosQuery, [rm]);
    console.log('Pedidos inseridos com sucesso');

    // Após inserir, excluir os pedidos da tabela carrinho
    const excluirCarrinhoQuery = 'DELETE FROM carrinho WHERE rm = ?';
    await db.execute(excluirCarrinhoQuery, [rm]);
    console.log('Carrinho excluído com sucesso');

    // Redirecionar para a página finalizar.html
    res.redirect('/finalizar.html');
  } catch (err) {
    console.log('Erro ao concluir pedido:', err.message);
  }
});

// Rota para servir o arquivo HTML (finalizar.html)
app.get('/finalizar.html', (req, res) => {
  res.sendFile(__dirname + '/finalizar.html');
});





app.get('/rastreio', async (req, res) => {
  const rm = req.session.rm; // Obtém o RM da sessão

  if (!rm) {
    return res.redirect('/login.html');
  }

  const query = 'SELECT * FROM pedidos WHERE rm = ?';
  
  try {
    const [results] = await db.query(query, [rm]);


    res.render('rastreio', { itens: results});
  } catch (err) {
    console.error('Erro ao buscar itens do carrinho:', err);
    return res.status(400).send('Erro ao buscar itens do carrinho');
  }
});

app.post("/excluir-rastreio", (req, res) => {
  const rm = req.session.rm;

    if (!rm) {
        return res.redirect('/login.html')
    }

    const deleteQuery = 'DELETE FROM pedidos WHERE rm = ?';

    db.query(deleteQuery, [rm], (error, results) => {
        if (error) {
            console.error(error);
        }
        res.render('rastreio', { message: 'Obrigado pela compra!' });
    });
    
});



// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
