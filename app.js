var express = require('express')
  , path = require('path')
  ,redis   = require('redis')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

//设置日志级别
io.set('log level', 1); 
var redis_login_user_pool = "chat_login_user_pool";
var base_img_path = "http://img1.osfeng.cn/head/";

module.exports.openClient = function (id) {
	//redis 两种配置方式
	var redis = require('redis'),
	RDS_PORT = 6379,        //端口号
	RDS_HOST = '123.57.6.81',    //服务器IP
	RDS_PWD = '',
	RDS_OPTS = {auth_pass:RDS_PWD},            //设置项
	redis_client = redis.createClient(RDS_PORT,RDS_HOST,RDS_OPTS);
	redis_client.on('ready',function(res){
		console.log('ready connect redis...');    
	});
	
	redis_client.select(id);
	return redis_client;
}

var influx = require('influx')
module.exports.influxdb = function(){
	var client = influx({
		  //cluster configuration
		  hosts : [
		    {
		      host : 'localhost',
		      port : 8086, //optional. default 8086
		      protocol : 'http' //optional. default 'http'
		    }
		  ],
		  // or single-host configuration
		  host : 'localhost',
		  port : 8086, // optional, default 8086
		  protocol : 'http', // optional, default 'http'
		  username : 'root',
		  password : 'root',
		  database : 'localdb'
		});
	return client;
		
}



module.exports.generateUUID = function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
};


//分布式session 操作
//var session = require('../sessionUtils');
//app.use(session());
//
//app.get('/user', function(req, res){
//    var id = req.query.sid;
//    session.getById(id, 'user', function(err, reply){
//        if(reply){
//               //Some thing TODO
//        }
//    });
//    res.end('');
//});

//WebSocket连接监听
io.on('connection', function (socket) {
  socket.emit('open');//通知客户端已连接
  redis_client = module.exports.openClient(15);
  redis_client.incrby(redis_login_user_pool,1,function (err, reply) {
      if (err)
          console.log('incrBy error:' + err);
      redis_client.quit();
  });
  // 打印握手信息
  // console.log(socket.handshake);

  // 构造客户端对象
  var client = {
    socket:socket,
    name:false,
    uuid:module.exports.generateUUID(),
    img:20,
    color:getColor()
  }

  // 对message事件的监听
  socket.on('message', function(msg){
    var obj = {time:getTime(),color:client.color};
    
 
    
    // 判断是不是第一次连接，以第一条消息作为用户名
    if(!client.name){
        client.name = msg;
        obj['text']=client.name;
        obj['author']='System';
        obj['type']='welcome';
        obj['uuid'] = client.uuid;
//        console.log(client.name + ' login');
        var imgNum = Math.floor(Math.random()*50) + 1;
        client.img = base_img_path +imgNum +  ".jpg";
        obj['img'] = client.img;
       
        //返回最近聊天信息
        var his = [];
        redis_client = module.exports.openClient(15);
        redis_client.lrange("node_chat",0,10,function (err, replys) {
            if (err)
            	console.log('lrange error:' + err);
            for(var i =0;i<replys.length;i++){
            	var robj = JSON.parse(replys[i]);
            	his[i] = robj;
            }
            obj["his"] = his;
            redis_client.quit();
            //返回欢迎语
            socket.emit('system',obj); 
        });
        
        //广播新用户已登陆
        socket.broadcast.emit('system',obj);
     }else{
    	 //如果超过200条记录自动删除
    	 redis_client = module.exports.openClient(15);
         redis_client.llen("node_chat",function (err, reply) {
             if (err)
                 console.log('llen error:' + err);
             if(reply > 300){
            	 redis_client.del("node_chat");
             }
             redis_client.quit();
         });
    	 
        //如果不是第一次的连接，正常的聊天消息
        obj['text']=msg;
        obj['author'] = client.name;
        obj['img'] = client.img;
        obj['uuid'] = client.uuid;
        obj['type']='message';
//        console.log(client.name + ' say: ' + msg);
        redis_client = module.exports.openClient(15);
        redis_client.lpush("node_chat",JSON.stringify(obj),function (err, reply) {
            if (err)
                console.log('lpush error:' + err);
            redis_client.quit();
        });
        
        // 返回消息（可以省略）
        socket.emit('message',obj);
        // 广播向其他用户发消息
        socket.broadcast.emit('message',obj);
      }
    });

    //监听出退事件
    socket.on('disconnect', function () {
        redis_client = module.exports.openClient(15);
        redis_client.get(redis_login_user_pool,function (err, reply) {
            if (err)
                console.log('get error:' + err);
            var obj = {
                    time:getTime(),
                    color:client.color,
                    author:'System',
                    online:reply,
                    text:client.name,
                    type:'disconnect'
                  };

            // 广播用户已退出
            socket.broadcast.emit('system',obj);
            redis_client.quit();
        });
        redis_client = module.exports.openClient(15);
        redis_client.incrby(redis_login_user_pool,-1,function (err, reply) {
            if (err)
                console.log('incrBy error:' + err);
            redis_client.quit();
        });
//      console.log(client.name + 'Disconnect');
    });
    
    
});

//express基本配置
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// 指定webscoket的客户端的html文件
app.get('/', function(req, res){
  res.sendfile('views/chatview.html');
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


var getTime=function(){
  var date = new Date();
  return date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
}

var getColor=function(){
  var colors = ['aliceblue','antiquewhite','aqua','aquamarine','pink','red','green',
                'orange','blue','blueviolet','brown','burlywood','cadetblue'];
  return colors[Math.round(Math.random() * 10000 % colors.length)];
}
