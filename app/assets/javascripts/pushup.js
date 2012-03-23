//Spainhower
//

if(!console || !console.log){
	console = {};
	console.log = function(){};
}

(function($){
	//globals
	var global = {
		'canvas': null,
		'width': null,
		'height': null,
		'context': null,
		'toDraw': [],
		'fps': 30,
		'goalRow': null,
		'player': null,
		'keystate': 'up'
	};

 
	//Defs
	var vector2d = Class.create({
		initialize: function(params /*x,y*/){
			this.x = params.x;
			this.y = params.y;
		},
		norm: function(){return Math.sqrt(Math.pow(this.x,2)+Math.pow(this.y,2));}
	});

	var gameobj = Class.create({
		initialize: function(params /*coordinates, velocity*/){
			//preserve vectors
			this.coord = params.coordinates;
			this.vel = params.velocity;
			//convenience
			this.x = params.coordinates.x;
			this.y = params.coordinates.y;
			this.vx = params.velocity.x;
			this.vy = params.velocity.y;
		}
	});

	var player = Class.create({
		initialize:function(params /*x, y, radius, fillStyle*/){
			this.coord = new vector2d({x: params.x, y: params.y});
			this.x = params.x;
			this.y = params.y;
			this.radius = params.radius;
			this.fillStyle = params.fillStyle;
		},
		animate: function(){
			if(global.keystate === 'left'){
				this.x = Math.max(this.x-5,this.radius);
			} 
			if(global.keystate === 'right'){
				this.x = Math.min(this.x+5, global.width-this.radius);
			}
			if(global.playerFallThisTick){
				this.y = Math.min(this.y+5, global.height-global.goalRow.blockDim.height-this.radius);
				if(this.y >= global.height - global.goalRow.blockDim.height - this.radius){
					global.goalRow.blocks.each(function(item){						
						if(global.player.x >= item.block.x && global.player.x < item.block.x+item.block.width){
							item.active = true;
							item.block.fillStyle = 'rgb(20,100,200)';
						}
					});
				}
			}
		},
		draw: function(context){
			context.fillStyle = this.fillStyle;
			context.strokeStyle = 'rgb(0,0,0)';
			context.beginPath();
			context.arc(this.x, this.y, this.radius, 0, Math.PI*2, false);
			context.fill();
			context.stroke();
		}
	});

	var block = Class.create(gameobj,{
		initialize: function($super, params /*width,height,x,y,vx,vy,fillStyle*/){
			$super({
				coordinates: new vector2d({x:params.x, y:params.y}),
				velocity: new vector2d({x:params.vx,y:params.vy})
			});
			this.width = params.width;
			this.height = params.height;
			this.fillStyle = params.fillStyle;
		},
		right: function(){return this.x+this.width;},
		left:function(){return x;},
		top:function(){return this.y},
		bottom:function(){return this.y+this.height},
		draw: function(context){
			context.fillStyle = this.fillStyle;
			context.fillRect(this.x, this.y, this.width, this.height);
			context.strokeStyle = this.strokeStyle || 'rgb(0,0,0)';
			context.strokeRect(this.x, this.y, this.width, this.height);
		}
	});

	var blockrow = Class.create({
		initialize: function(params /*count, y*/){
			this.blocks = [];
			for(var i=0 ; i<params.count ; i++){
				var blockWidth = global.width/params.count;
				this.blocks[i] = {
					'active': false,
					'block': null
				}
			}

			var blockWidth = global.width / params.count;
			this.blockDim = {
				width: blockWidth,
				height: blockWidth/2
			}
		},
		draw: function(context){
			this.blocks.each(function(item){ item.block.draw(context); });
		}
	});

	var movingblockrow = Class.create(blockrow, {
		initialize: function($super, params /*count, y, vy, p*/){
			$super(params);
			for(var i=0 ; i<params.count ; i++){
				this.blocks[i].block = new block({
					width: this.blockDim.width,
					height: this.blockDim.height,
					x: i * this.blockDim.width,
					y: params.y,
					vx: 0,
					vy: params.vy,
					fillStyle: 'rgba(200,0,0,0.75)'
				});
			}
			this.p = params.p;
			this.defaultFill = this.blocks[0].block.fillStyle;
			this.randomize();
		},
		animate: function(){
			var y = this.blocks[0].block.y + this.blocks[0].block.vy;
			var height = this.blocks[0].block.height;

			//check for passing top or bottom and recycle
			if (y<0-this.blockDim.height) {
				y = global.height;
				this.randomize();
			} else if (y>global.height+this.blockDim.height){
				y= -this.blockDim.height;
				this.randomize();
			}

			//set new vals
			this.blocks.each(function(item){
				item.block.y = y;		
			});

			//check player
			var playerBottom = global.player.y + global.player.radius;
			var playerLeft = global.player.x - global.player.radius;
			var playerRight = global.player.x + global.player.radius;
			if(playerBottom>y && playerBottom <y+height){
				this.blocks.each(function(item){
					if(global.player.x >= item.block.x && global.player.x < item.block.x+item.block.width){
						if(!item.active){
							global.playerFallThisTick = true;
						} else {
							global.player.y = y-global.player.radius;
							global.playerFallThisTick = false;
						}		
					}
				});
			}
		},
		randomize: function(){
			var oneIsOpen = false;
			var thisRow = this;
			this.blocks.each(function(item){
				if(Math.random() > thisRow.p){
					item.active = true;
					item.block.fillStyle = thisRow.defaultFill;
					item.block.strokeStyle = 'rgb(0,0,0)';
				} else {
					item.active = false;
					oneIsOpen = true;
					item.block.fillStyle = 'rgba(255,255,255,0)';
					item.block.strokeStyle = item.block.fillStyle;
				}		
			});
			if(!oneIsOpen){
				var openBlock = this.blocks[Math.floor(Math.random()*this.blocks.length)];
				openBlock.active = false;
				openBlock.block.fillStyle = 'rgba(255,255,255,0)';
				openBlock.block.strokeStyle = openBlock.block.fillStyle;
			}
		}
	});

	var goalblockrow = Class.create(blockrow, {
		initialize: function($super, params /*count*/){
			var y = global.height - (global.width/params.count)/2;
			$super({count: params.count, y: y});

			for(var i=0 ; i<params.count ; i++){
				this.blocks[i].block = new block({
					width: this.blockDim.width,
					height: this.blockDim.height,
					x: i * this.blockDim.width,
					y: y,
					vx: 0,
					vy: 0,
					fillStyle: 'rgb(0,0,200)'
				});
			}
		}
	});

	//Game
	var initCanvas = function(){
		global.canvas = $("#viewport");

		global.width = global.canvas.width();
		global.height = global.canvas.height();

		if(global.canvas[0].getContext){
			global.context  = global.canvas[0].getContext('2d');
		} else {
			console.log("! No canvas");
		}
	};

	var initObjects = function (){
		var list = global.toDraw;
	
		var count = 6;//row count
		
		//player
		global.player = new player({
			x: global.width/2,
			y: (3*global.height)/4,
			radius: (global.width/count)/Math.PI,
			fillStyle: 'rgb(125,200,100)'
		});
		list.push(global.player);

		//rows
		var totRows = Math.floor((global.height/((global.width/count)/2))/3);
		for(var i=0 ; i<totRows ; i++){
			list.push(new movingblockrow({
				count: count, 
				y: i * Math.floor(global.height/totRows),
				vy: -2,
				p: 0.25
			}));
		}
		
		//goal row
		global.goalRow = new goalblockrow({
			count: count			
		});
		list.push(global.goalRow);
	};

	var draw = function(){
		var ctx = global.context;
		var list = global.toDraw;

		//ctx.globalCompositeOperation = 'destination-over';
		ctx.clearRect(0,0,global.canvas.width(),global.canvas.height());
		global.playerFallThisTick = true;

		list.each(function(obj){ 
			if(obj.animate){
				obj.animate();
			}
				
			if(obj.draw){ 
				obj.draw(ctx); 
			}
		});
	};

	$("document").ready(function(event){
		initCanvas();

		initObjects();

		setInterval(draw,1000/global.fps);

		//input events
		$(document).keydown(function(event){
			switch(event.keyCode){
				case 37: 
				case 65:
				case 100:
					global.keystate = 'left';
					break;
				case 39:
				case 68:
				case 102:
					global.keystate = 'right';
					break;
				default:
					break;
			}
		}).keyup(function(event){
			global.keystate = 'up';
		});
	});

}(jQuery));
