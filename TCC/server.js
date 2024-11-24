const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer'); // Para upload de imagens
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Inicializar o app
const app = express();

// Configurações
app.set('view engine', 'ejs'); // Aqui deve estar após a inicialização do app

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessão
app.use(session({
  secret: 'as-tapadas',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Configuração do Multer para upload de arquivos
const storage = multer.memoryStorage(); // Armazena o arquivo na memória
const upload = multer({ storage: storage });

// Conexão com o banco de dados MySQL
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'poliwear',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Rota para a página de login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota de cadastro de usuário
app.post('/cadastro', async (req, res) => {
  const { rm, turma, prim_nome, ult_nome, email, senha, confirm_senha } = req.body;

  // Verificação das senhas
  if (senha !== confirm_senha) {
    return res.status(400).send('As senhas não coincidem!');
  }else{

  try {
    // Verificar se o RM já está cadastrado
    const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);

    if (rows.length > 0) {
      return res.status(400).send('Usuário já cadastrado!');
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir novo usuário no banco de dados
    await db.query('INSERT INTO usuarios (rm, turma, prim_nome, ult_nome, email, senha) VALUES (?, ?, ?, ?, ?, ?)', [rm, turma, prim_nome, ult_nome, email, hashedPassword]);

   return res.status(400).send('Usuário cadastrado com sucesso!');
  } catch (err) {
    return res.status(400).send('Erro no servidor!');
  }
}
});

// Rota de login
app.post('/login', async (req, res) => {
  const { rm, senha } = req.body;

  try {
    // Verificar se o usuário existe
    const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);

    if (rows.length === 0) {
      return res.status(400).send('Usuário não encontrado!');
    }

    const usuario = rows[0];

    // Verificar a senha
    const match = await bcrypt.compare(senha, usuario.senha);
    if (!match) {
      return res.status(400).send('Senha incorreta!');
    }

    // Armazenar dados na sessão
    req.session.loggedin = true;
    req.session.firstName = usuario.prim_nome;
    req.session.rm = usuario.rm; // Armazenar RM na sessão

    console.log('Sessão após login:', req.session); // Verificar a sessão após o login

    // Redirecionar para a tela inicial
    return res.redirect('/telainicial.html');
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    return res.status(500).send('Erro no servidor!');
  }
});

// Rota para a tela inicial
app.get('/telainicial.html', (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(path.join(__dirname, 'public', 'telainicial.html'));
  } else {
    res.redirect('/login.html');
  }
});

// Rota para o perfil do usuário
app.get('/perfil', async (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login.html'); // Redirecionar se o usuário não estiver logado
  }

  try {
    // Buscar o usuário no banco de dados baseado no RM armazenado na sessão
    const [rows] = await db.query('SELECT rm, turma, prim_nome, ult_nome, email, imagem_perfil FROM usuarios WHERE rm = ?', [req.session.rm]);

    if (rows.length === 0) {
      return res.status(400).send('Usuário não encontrado!');
    }

    // Enviar os dados do usuário para a página de perfil (exceto senha)
    const usuario = rows[0];
    res.json({
      rm: usuario.rm,
      nome_completo: `${usuario.prim_nome} ${usuario.ult_nome}`, // Concatenando primeiro e último nome
      turma: usuario.turma,
      email: usuario.email,
      imagem_perfil: usuario.imagem_perfil ? usuario.imagem_perfil.toString('base64') : null // Converter imagem para base64
    });
  } catch (err) {
    console.error('Erro ao buscar dados do perfil:', err);
    return res.status(500).send('Erro no servidor!');
  }
});

// Rota para upload de imagem de perfil
app.post('/upload', upload.single('file'), async (req, res) => {
  const imagem = req.file.buffer;
  const rm = req.session.rm; // RM do usuário logado

  try {
      await db.query('UPDATE usuarios SET imagem_perfil = ? WHERE rm = ?', [imagem, rm]);
      res.json({ message: 'Imagem salva com sucesso!' });
  } catch (err) {
      console.error('Erro ao salvar a imagem:', err);
      res.status(500).json({ message: 'Erro ao salvar a imagem.' });
  }
});

// Rota para obter dados do usuário
app.get('/getUser', (req, res) => {
  if (req.session.loggedin) {
    res.json({ prim_nome: req.session.firstName }); // Retornar o nome do usuário
  } else {
    res.sendFile(path.join(__dirname, 'public', 'telainicial.html'));
  }
});

// Rota para adicionar item ao carrinho
app.post('/adicionarCarrinho', (req, res) => {
  const { titulo, preco, tamanho, cor, quantidade, imagem, nome_camiseta, num_camiseta } = req.body;
  const rm = req.session.rm;  // Pegando o RM da sessão

  if (!rm) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }

  // SQL query para inserir os dados no banco de dados, incluindo o caminho da imagem
  const sql = `INSERT INTO carrinho (titulo, preco, tamanho, cor, quantidade, rm, imagem, nome_camiseta, num_camiseta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [titulo, preco, tamanho, cor, quantidade, rm, imagem, nome_camiseta, num_camiseta], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send("Erro ao adicionar ao carrinho.");
      } else {
          res.status(200).json({ message: 'Produto adicionado ao carrinho com sucesso!' });
      }
  });
});


// Rota para visualizar carrinho
app.get('/carrinho', async (req, res) => {
  const rm = req.session.rm; // Obtém o RM da sessão

  if (!rm) {
    return res.redirect('/login.html');
  }

  const query = 'SELECT * FROM carrinho WHERE rm = ?';
  
  try {
    const [results] = await db.query(query, [rm]);

    // Calcula o total somando o subtotal (preço * quantidade) de cada item
    const total = results.reduce((acc, item) => acc + (item.preco * item.quantidade), 0).toFixed(2);

    res.render('carrinho', { itens: results, total });
  } catch (err) {
    console.error('Erro ao buscar itens do carrinho:', err);
    return res.status(500).send('Erro ao buscar itens do carrinho');
  }
});


app.post('/remover-produto', async (req, res) => {
  const produtoId = req.body.produto_id;

  try {
    const [result] = await db.query('DELETE FROM carrinho WHERE id = ?', [produtoId]);

    if (result.affectedRows === 0) {
      return res.status(404).send('Produto não encontrado no carrinho!');
    }

    console.log('Produto excluído com sucesso:', produtoId);
    res.redirect('/carrinho'); // Redireciona para a página do carrinho após a exclusão
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    return res.status(500).send('Erro no servidor!');
  }
});


app.post('/concluirPedido', async (req, res) => {
  const rm = req.session.rm; // Obtém o RM do usuário logado

  if (!rm) {
    return res.status(400).send('Erro ao concluir o pedido: RM não encontrado.');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Seleciona todos os itens do carrinho para o RM atual
    const [itens] = await connection.query('SELECT * FROM carrinho WHERE rm = ?', [rm]);

    // Verifique se há itens no carrinho
    if (itens.length === 0) {
      await connection.rollback();
      return res.status(400).send('Erro ao concluir o pedido: Carrinho vazio.');
    }

    // Insere cada item do carrinho na tabela de pedidos
    for (const item of itens) {
      const { id, titulo, preco, tamanho, cor, quantidade, imagem } = item;

      await connection.query(
        'INSERT INTO pedidos (rm, titulo, preco, tamanho, cor, quantidade, imagem) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [rm, titulo, (preco * quantidade).toFixed(2), tamanho, cor, quantidade, imagem]
      );

      // Exclui o item do carrinho após ser inserido no pedido
      await connection.query('DELETE FROM carrinho WHERE id = ?', [id]);
      res.redirect('/finalizar.html');
    }

    await connection.commit();
     // Redireciona para a página de confirmação
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao concluir pedido:', err);
    res.status(500).send('Erro ao concluir pedido.');
  } finally {
    connection.release();
  }
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
        return res.status(400).json({ success: false, message: 'Usuário não está logado.' });
    }

    const deleteQuery = 'DELETE FROM pedidos WHERE rm = ?';

    db.query(deleteQuery, [rm], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Erro ao excluir pedidos.' });
        }
        res.render('rastreio', { message: 'Obrigado pela compra!' });
    });
    
});



// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
