 $(function () {
            var content = $('#content');
            var status = $('#text');
            var input = $('#text');
            var myName = false;
            //建立websocket连接
            socket = io.connect('http://123.57.6.81:3000');
            //收到server的连接确认
            socket.on('open',function(){
                status.attr('placeholder',"请输入您的名字");
            });

            //监听system事件，判断welcome或者disconnect，打印系统消息信息
            socket.on('system',function(json){
                var p = '';
                if (json.type === 'welcome'){
                	var his = json.his;
                    if(his != undefined){
                    	var hisp = "";
                    	for(var i =his.length-1;i>-1;i--){
                    		hisp = hisp +  '<li><img title='+his[i].author+' src='+his[i].img+'></img><span> '+ his[i].text +'</span></li>';
                    	}
                    	content.html(hisp);
                    }
                    if(myName==json.text) status.text(myName + ': ').css('color', json.color);
                    var p = '<li>系统提示:  欢迎  ' + json.text +' 加入</li>';
                    $("#myimg").attr("src",json.img);
                    
                    if($("#uuid").val() == ""){
                    	$("#uuid").val(json.uuid);
                    }
                    content.append(p);
                    
                }else if(json.type == 'disconnect'){
                	if(json.text != false){
                		p = '<li>系统提示:  ' + json.text +' 退出(当前在线:'+json.online+')</li>';
                	}
                	content.append(p); 
                }
                var last = $('.content li').last();
                content.animate({"scrollTop":last.offset().top * 2 +$("#content").children("li").length * 64}, 'slow'); 
            });

            //监听message事件，打印消息信息
            socket.on('message',function(json){
            	if(json.uuid == $("#uuid").val()){
            		var p = '<li ><img class="imgright" title='+json.author+' src='+json.img+'></img><span class="spanright">'+json.text+' </span></li>';
            	}else{
            		var p = '<li><img title='+json.author+' src='+json.img+'></img><span>'+json.text+' </span></li>';
            	}
                $('#content').append(p);
                var last = $('#content li').last();
                $('#content').animate({"scrollTop": last.offset().top * 2 +$("#content").children("li").length * 64 }, 'slow'); 
            });

            //通过“回车”提交聊天信息
            input.keydown(function(e) {
                if (e.keyCode === 13) {
                    var msg = $(this).val();
                    if (!msg) return;
                    socket.send(msg);
                    $(this).val('');
                    status.attr('placeholder',"说点什么吧..");
                    if (myName === false) {
                        myName = msg;
                    }
                }
            });
            
            $("#btn").click(function(){
            	 var msg = $("#text").val();
                 if (!msg) return;
                 socket.send(msg);
                 $("#text").val('');
                 status.attr('placeholder',"说点什么吧..");
                 if (myName === false) {
                     myName = msg;
                 }
            });
            var getTime=function(){
            	  var date = new Date();
            	  return date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
            	}
            var int=setInterval(clock,50)
            function clock(){
            		$("#head_time").text(getTime());
            }
 });
