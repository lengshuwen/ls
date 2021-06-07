var express = require('express');
var router = express.Router();
var con = require('../dbconfig').connection;
var sqls = require('../dbconfig').sqls;
var crypto = require('crypto');
var articles = [];
/* 访问首页 */
router.get('/', function(req, res, next) {con.query(sqls.searchArticles,function(err,result,fields){
		articles = result;
		articles.forEach(function(ele){
			var year = ele.articleTime.getFullYear();
			var month = ele.articleTime.getMonth()+1 >10?
			ele.articleTime.getMonth()+1:'0'+(ele.articleTime.getMonth()+1);
			var day = ele.articleTime.getDate() >10?
			ele.articleTime.getDate():'0'+ele.articleTime.getDate();
			ele.articleTime = year + '-' + month + '-' + day;
		})
		if(req.session.user){//判断session是否存在
			res.render('index', {
				articles:articles,
				isLogin:true,
				username:req.session.user.username
			});
		}else{
			res.render('index', {
				articles:articles,
				isLogin:false
			});
		}
	});
});
/* 关于博客 */
router.get('/about', function(req, res, next) {
	if(req.session.user){//判断session是否存在
		res.render('about',{
			isLogin:true,
			username:req.session.user.username	
		});
	}else{	//没有登录，先跳转登录界面
		res.render('about',{isLogin:false});
	}
});
/* 登录页面 */
router.get('/login',function (req, res) {
    res.render('login',{
    	isLogin:false
    });
});
/* 登录验证 ajax */
router.post('/ajax_login', function(req, res, next) {
	var username = req.body.username;
	var password = req.body.password;
	console.log(username,password);
	if(username == ''||password == ''){
		res.json({msg:'用户名或密码不能为空'});
	}else{
		con.query(sqls.searchUser,[username],function (err, result) {
		    if(err){
		      console.log('[SELECT ERROR] - ',err.message);
		      return;
		    }
		    if(!result[0]){
		    	res.json({msg:'该用户不存在'});
		    }else{
		    	con.query(sqls.loginSql,[username,password],function (err, result) {
				        if(err){
				          console.log('[SELECT ERROR] - ',err.message);
				          return;
				        }
				        if(result[0]){
				        	console.log("登录成功");
				        	req.session.user = result[0];
				        	res.json({page:'/'});
				        }else{
				        	res.json({msg:'密码错误'});
				        }
				});
		    }
		});
	}
});
/* 注册验证 ajax */
router.post('/ajax_reg', function(req, res, next) {
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;
	
	console.log(username,password);
	if(username == ''||password == ''||password2 == ''){
		res.json({msg:'用户名或密码不能为空'});
	}else if(password != password2){
		res.json({msg:'两次输入密码不一致'});
	}else{
		con.query(sqls.searchUser,[username],function (err, result) {
		    if(err){
		      console.log('[SELECT ERROR] - ',err.message);
		      return;
		    }
		    if(result[0]){
		    	res.json({msg:'该用户名已经注册过了'});
		    }else{
		    	con.query(sqls.insert,[username,password],function (err, result) {
				        if(err){
				          console.log('[SELECT ERROR] - ',err.message);
				          return;
				        }
				        if(result){
				        	console.log("注册成功");
				        	res.json({message:"恭喜，账号注册成功",page:'/'});
				        }else{
				        	res.json({msg:'注册失败'});
				        }
				});
		    }
		});
	}
});
/* 退出登录 */
router.get('/logout', function (req, res) {
    req.session.user = null; // 删除session
    res.redirect('/');
});
/* 文章内容页 */
router.get('/articles/:articleID',function(req, res, next) {
	var articleID = req.params.articleID;
	var sql = 'SELECT * FROM article WHERE articleID='+articleID;
	sql=sql+";select*from comment where articleID="+articleID;
	con.query(sql,function(err,rows,fields){
		if(err){
			console.log(err);
			return;
		}
		var sql2 = 'UPDATE article SET articleClick=articleClick+1 WHERE articleID='+articleID;
		
		var article = rows[0][0];
		var comment=rows[1]
		
		con.query(sql2,function(err,rows,fields){
			if(err){
				console.log(err);
				return;
			}
			var year = article.articleTime.getFullYear();
			var month = article.articleTime.getMonth()+1 >10?
			article.articleTime.getMonth()+1:'0'+(article.articleTime.getMonth()+1);
			var day = article.articleTime.getDate() >10?
			article.articleTime.getDate():'0'+article.articleTime.getDate();
			article.articleTime = year + '-' + month + '-' + day;
			if(req.session.user){//判断session是否存在
				res.render('article',{
					article:article,
					isLogin:true,
					comment:comment,
					username:req.session.user.username
				});
			}else{
				res.render('article',{
					article:article,
					comment:comment,
					isLogin:false
				});
			}
		});
	});
});
/* 撰写文章页面 */
router.get('/edit',function(req,res,next){
	if(req.session.user){//判断session是否存在
		res.render('edit',{
			isLogin:true,
			username:req.session.user.username	
		});
	}else{	//没有登录，先跳转登录界面
		res.render('login',{isLogin:false});
	}
});
/* 文章发表 */
router.post('/ajax_edit',function(req,res,next){
	var title = req.body.articleTitle;
	var content = req.body.articleContent;
	var author = req.session.user.username;
	var sql = 'insert into article (articleTitle,articleAuthor,articleContent,articleTime,articleClick) values (?,?,?,CURDATE(),0)';
	con.query(sql,[title,author,content],function(err,rows,fields){
		if(err){
			console.log(err);
			return;
		}
		res.json({msg:'ok',page:'/'});
	});
});
router.post("/delete",(req,res)=>{
	
	if(req.session.user){
		
		if(req.session.user.username==req.body.username){
			
			con.query("delete from article where articleTitle=?",[req.body.title],(err,data)=>{
				
				if(err){res.json({result:"删除失败"})}else{res.json({result:"删除成功"})}
			})
		}else{res.json({result:"仅限本人删除"})}
	}else{
		
		res.json({result:"未登录"})}
})
router.get("/managerLogin",(req,res)=>{
	res.render("managerLogin")
	
	
})
router.get("/tables",(req,res)=>{
	
	if(req.query.user=="阿舒"&&req.query.password=="202000892"){
		con.query("select * from user",(err,data)=>{
			if(err){
				console.log(err);
			}else{
				res.render("tables",{data:data})
			}
		})
	}else{res.redirect("/login")}
	
})
router.get("/udelete",(req,res)=>{
	var username= req.query.username
	con.query("delete from user where username=?",[username],(err,data)=>{
		if(err){res.json({result:"删除失败"})}else{
			console.log(username);
			res.json({result:"删除成功"})
		}
	})
})
router.post("/update",(req,res)=>{
	con.query("update article set articleContent=? where articleAuthor=?",[req.body.content,req.body.username],(err,data)=>{
		if(err){console.log(err); res.json({result:"修改失败"})}else{res.json({result:"修改成功"})}
	})
})
router.get("/textarea/:articleID",(req,res)=>{

	var articleID = req.params.articleID;
	var sql = 'SELECT * FROM article WHERE articleID='+articleID;
	con.query(sql,function(err,rows,fields){
		if(err){
			console.log(err);
			return;
		}
		var sql2 = 'UPDATE article SET articleClick=articleClick+1 WHERE articleID='+articleID;
		var article = rows[0];
		con.query(sql2,function(err,rows,fields){
			if(err){
				console.log(err);
				return;
			}
			var year = article.articleTime.getFullYear();
			var month = article.articleTime.getMonth()+1 >10?
			article.articleTime.getMonth()+1:'0'+(article.articleTime.getMonth()+1);
			var day = article.articleTime.getDate() >10?
			article.articleTime.getDate():'0'+article.articleTime.getDate();
			article.articleTime = year + '-' + month + '-' + day;
			if(req.session.user){//判断session是否存在
				res.render('textarea',{
					article:article,
					isLogin:true,
					username:req.session.user.username
				});
			}else{
				res.render('textarea',{
					article:article,
					isLogin:false
				});
			}
		});
	});
})
router.get("/add",(req,res)=>{
	res.render("add")
})
router.get("/update/password",(req,res)=>{
	console.log(req.query.password);
	con.query("update user set password=? where username=?",[req.query.password,req.query.username],(err,data)=>{
if(err){res.json({result:"修改失败"})}else{res.json({result:"修改成功"})}
	})
})
router.get("/judge",(req,res)=>{
	console.log(req.query.username);
	if(req.session.user){
		if(req.query.username==req.session.user.username){
		res.json({judge:1})
	}else{res.json({judge:0,result:"仅限本人修改"})}}
	else {res.json({judge:0,result:"未登录"})}
})
router.get("/:username",(req,res)=>{
	var username =req.params.username
	con.query("select * from user where username=?",[username],(err,data)=>{
		res.render("user",{data:data})
	})
	
  })
  router.post("/comment",(req,res)=>{
	  if(req.session.user){
		con.query("insert comment values(?,?,?)",[req.body.articleID,req.body.content,req.session.user.username],(err,data)=>{
			if(err){console.log(err);;res.json({result:"评论失败"})}else{res.json({result:"评论成功"})}
		})
	  }else{res.json({result:"未登录"})}
  })
module.exports = router;
