const express = require('express');
const nunjucks = require('nunjucks');
const multer = require('multer');

const app = express();
const port = 3000;

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

// 미들웨어 설정
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// 게시물 객체 생성 함수
function createPost(id, title, content, rating, imageUrl, password) {
  return {
    id,
    title,
    content,
    rating,
    imageUrl,
    password,
    comments: [],
  };
}

// 데이터베이스 대신에 임시로 사용할 변수
let posts = [
  {
    id: 1,
    title: '애플 14PRO',
    content: '안녕하세요! 역시 애플은 AP 성능하나 믿고 쓰는것같습니다.',
    rating: 5,
    imageUrl: 'default2.png',
    password: 'password',
  },
  {
    id: 2,
    title: '구글 Pixel폰',
    content: '2년반째 사용중인데 렉없이 잘쓰고있습니다. \n 단점은 역시 한국에서는 갤럭시가 최고인듯합니다',
    rating: 4,
    imageUrl: 'default1.png',
    password: 'password',
  },
];

// 시리얼 번호 리스트
const serialNumbers = ['admin', '0305-tyadd', '1234-abcd'];

// 게시물 목록 보기
app.get('/', (req, res) => {
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
  posts.push(newPost);
  res.redirect('/');
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
  res.redirect('/');
});

// 시리얼 번호 입력 폼 보기
app.get('/adjust', (req, res) => {
  res.render('adjust');
});

// 시리얼 번호 처리
app.post('/adjust', (req, res) => {
  const { serialNumber } = req.body;
  if (serialNumbers.includes(serialNumber)) {
    res.redirect('/create');
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
  console.log(`Server is listening on port ${port}`);
});