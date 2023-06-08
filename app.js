const express = require('express');
const nunjucks = require('nunjucks');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const port = 8080;

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Nunjucks 설정
nunjucks.configure('views', {
  autoescape: true,
  express: app,
});

app.set('view engine', 'html');

// 이메일 보내기 함수
async function sendEmail(to, subject, html) {
  let transporter = nodemailer.createTransport({
    service: 'naver',
    host: 'smtp.naver.com',
    port: 587,
    secure: false,
    auth: {
      user: 'every0520@naver.com',
      pass: '05200520',
    },
  });

  let mailOptions = {
    from: 'akflzntlsk@naver.com',
    to: to,
    subject: subject,
    html: html,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Finish sending email:', info.response);
    transporter.close();
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// 미들웨어 설정
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// 게시물 객체 생성 함수
function createPost(id, title, content, rating, imageUrl, password) {
  const post = {
    id,
    title,
    content,
    rating,
    imageUrl,
    password,
    comments: [],
  };

  return post;
}

// 데이터베이스 대신에 임시로 사용할 변수
let posts = [
  {
    id: 1,
    title: '애플 14PRO',
    content: '안녕하세요! 역시 애플은 AP 성능하나 믿고 쓰는 것 같습니다.',
    rating: 5,
    imageUrl: 'default2.png',
    password: 'password',
  },
  {
    id: 2,
    title: '구글 Pixel폰',
    content: '2년 반째 사용 중인데 렉없이 잘 쓰고 있습니다. \n 단점은 역시 한국에서는 갤럭시가 최고인 듯합니다',
    rating: 4,
    imageUrl: 'default1.png',
    password: 'password',
  },
];

//인증 대기 중인 게시물 배열
let waitingPosts = [];

// 시리얼 번호 리스트
const serialNumbers = ['admin', '0305-tyadd', '1234-abcd'];

// transporter 변수를 전역 범위로 이동
let transporter = nodemailer.createTransport({
  service: 'naver',
  host: 'smtp.naver.com',
  port: 587,
  secure: false,
  auth: {
    user: 'akflzntlsk@naver.com',
    pass: 'C4X974K817BN',
  },
});

// 메인 페이지 보기
app.get('/', (req, res) => {
  res.render('main');
});

// 게시물 목록 보기
app.get('/index', (req, res) => {
  res.render('index', { posts });
});

app.get('/posts', (req, res) => {
  res.render('index', { posts });
});

// 게시물 작성 폼 보기
app.get('/create', (req, res) => {
  res.render('create');
});

// 게시물 작성 처리
app.post('/create', upload.single('image'), (req, res) => {
  const { title, content, rating, password } = req.body;
  const id = Date.now();
  const imageUrl = req.file ? req.file.filename : 'default.jpg';
  const newPost = createPost(id, title, content, rating, imageUrl, password);
  
  //인증 대기 게시물 리스트에 추가
  waitingPosts.push(newPost);
  console.log(waitingPosts);

  res.redirect('/waiting');
});

//인증 대기 페이지 보기
app.get('/waiting', (req, res) => {
  const isAdmin = false;
  const isEmailAuthenticated = true;
  res.render('waiting', { waitingPosts, isAdmin, isEmailAuthenticated });
});

app.get('/waiting/admin', (req, res) => {
  const isAdmin = true;
  const isEmailAuthenticated = true;
  res.render('waiting-admin', { waitingPosts, isAdmin, isEmailAuthenticated});
});0

app.get('/waiting/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = waitingPosts.find((p) => p.id === id);
  if(!post){
    res.status(404).send('게시물을 찾을 수 없습니다.');
    return;
  }

  const isAdmin = req.query.isAdmin === 'true';
  const isEmailAuthenticated = req.query.isEmailAuthenticated === 'true';

  if(isAdmin && isEmailAuthenticated) {
    res.render('waiting-admin', { waitingPosts, isAdmin, isEmailAuthenticated});
  } else {
    res.render('waiting', { post, isAdmin, isEmailAuthenticated });
  }
});

//게시물 인증 처리
app.post('/approve/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const postIndex = waitingPosts.findIndex((p) => p.id === id);
  if(postIndex === -1){
    res.status(404).send('게시물을 찾을 수 없습니다.');
    return;
  }
  const post = waitingPosts[postIndex];

  //게시물을 게시판으로 이동
  posts.push(post);
  waitingPosts.splice(postIndex, 1);

  res.redirect('/posts');
});

app.post('/reject/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const postIndex = waitingPosts.findIndex((p) => p.id === id);
  if(postIndex === -1) {
    res.status(404).send('게시물을 찾을 수 없습니다.');
    return;
  }

  //게시물 삭제
  waitingPosts.splice(postIndex, 1);

  res.redirect('/waiting');
});

// 게시물 상세 보기
app.get('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = posts.find((p) => p.id === id);
  if (!post) {
    res.status(404).send('게시물을 찾을 수 없습니다.');
    return;
  }
  res.render('detail', { post });
});

// 게시물 수정 폼 보기
app.get('/posts/:id/edit', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = posts.find((p) => p.id === id);
  res.render('edit', { post });
});

// 게시물 수정
app.post('/posts/:id/edit', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = posts.find((p) => p.id === id);
  if (!post) {
    res.status(404).send('게시물을 찾을 수 없습니다.');
    return;
  }
  const { title, content, rating, password } = req.body;
  if (password !== post.password) {
    res.status(403).send('비밀번호가 일치하지 않습니다.');
    return;
  }
  post.title = title;
  post.content = content; // 추가: 내용(content)도 업데이트
  post.rating = rating; // 추가: 평점(rating)도 업데이트
  res.redirect(`/posts/${id}`); // 수정 후 상세 페이지로 리다이렉트
});

// 게시물 삭제
app.post('/posts/:id/delete', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const postIndex = posts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    res.status(404).send('게시물을 찾을 수 없습니다.');
    return;
  }
  const post = posts[postIndex];
  const { password } = req.body;
  if (password !== post.password) {
    res.status(403).send('비밀번호가 일치하지 않습니다.');
    return;
  }
  posts.splice(postIndex, 1);
  res.redirect('/index');
});

// 시리얼 번호 입력 폼 보기
app.get('/adjust', (req, res) => {
  res.render('adjust');
});

// 시리얼 번호 처리
app.post('/adjust', (req, res) => {
  const { serialNumber } = req.body;
  if (serialNumbers.includes(serialNumber)) {
    const mailOptions = {
      from: 'akflzntlsk@naver.com',
      to: 'akflzntlsk@naver.com',
      subject: '인증 대기 중인 게시글이 있습니다.',
      html: '<p>게시글을 인증해주시기 바랍니다.</p><a href="http://localhost:8080/waiting/admin">인증하기</a>',
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).send('Failed to send verification email.');
      } else {
        console.log('Email sent: ' + info.response);
        res.redirect('/create');
      }
    });
  } else {
    res.status(403).send('유효한 시리얼 번호가 아닙니다.');
  }
});

// 댓글 작성 처리
app.post('/posts/:id/comments', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = posts.find((p) => p.id === id);
  if (!post) {
    res.status(404).send('게시물을 찾을 수 없습니다.');
    return;
  }
  const { comment } = req.body;
  if (!post.comments) {
    post.comments = []; // 댓글 배열이 없는 경우 초기화
  }
  post.comments.push(comment);
  res.redirect(`/posts/${id}`);
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행중입니다.`);
});