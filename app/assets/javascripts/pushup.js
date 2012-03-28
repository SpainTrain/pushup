//Spainhower
//

if(!console || !console.log){
	console = {};
	console.log = function(){};
}

(function($){
	//config (don't change these procedurally)
	var CONFIG = {
		'ROW_COUNT' : 6
	};

	//globals
	var global = {
		'canvas': null,
		'width': null,
		'height': null,
		'context': null,
		'toDraw': [],
		'fps': 50,
		'goalRow': null,
		'player': null,
		'player_nominal_vy': -1,
		'block_vy': 1,
		'inputstate': {
				left: false,
				right: false
			},
		'interval_id': null
	};

	//Defs
	var util = {
		findHypotenuse: function(a,b){
			//find c where a^2+b^2=c^2
			return Math.sqrt(Math.pow(a,2)+Math.pow(b,2));
		}
	}
	
	var gameobj = Class.create({
		initialize: function(params /*x, y, velx, vely*/){
			this.x = params.x;
			this.y = params.y;
			this.vx = params.velx;
			this.vy = params.vely;
		},
		update: function(){
			this.x += this.vx;
			this.y += this.vy;
		}
	});

	var player = Class.create(gameobj, {
		initialize:function($super, params /*x, y, radius, fillStyle*/){
			$super({
				x: 		params.x,	y: 		params.y,
				velx: 0, 				vely: global.player_nominal_vy
			});
			this.radius = params.radius;
			this.fillStyle = params.fillStyle;
			this.state = {pushing: true};
		},
		right: function(){return this.x+this.radius;},
		left:function(){return this.x-this.radius;},
		top:function(){return this.y-this.radius},
		bottom:function(){return this.y+this.radius},
		update: function($super){
			//Check input and update velocity
			this.vx = global.inputstate.left ? (global.inputstate.right? 0 : -5) : (global.inputstate.right ? 5 : 0);

			//update gameobj
			$super();

			//check bounds
			if(this.x + this.radius >= global.width){
				this.x = global.width - this.radius -1;
			} else if (this.x - this.radius < 0){
				this.x = this.radius + 1;
			}
			if(this.y + this.radius >= global.height){
				//TODO: GAME OVER
			} else if (this.y - this.radius <= global.goalRow.blockDim.height){
				this.y = this.radius + global.goalRow.blockDim.height;
			}

			//reset vy for next tick
			this.vy = global.player_nominal_vy;
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
				x:params.x, y:params.y,
				velx:params.vx, vely:params.vy
			});
			this.width = params.width;
			this.height = params.height;
			this.fillStyle = params.fillStyle;
		},
		right: function(){return this.x+this.width;},
		left:function(){return this.x;},
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
		update: function(){
			var y = this.blocks[0].block.y + this.blocks[0].block.vy;
			var vy = this.blocks[0].block.vy;
			var height = this.blockDim.height;

			//check for passing top or bottom and recycle
			if (y<0-this.blockDim.height) {
				y = global.height;
				this.blocks.each(function(item){item.block.y = y + vy});
				this.randomize();
			} else if (y>global.height+this.blockDim.height){
				y = 0;
				this.blocks.each(function(item){item.block.y = y-vy});
				this.randomize();
			}
			
			//update the blocks
			this.blocks.each(function(item){
				item.block.update();		
			});

			//check player
			if(global.player.top() <= y + height && global.player.y > y + height){
				var leftBlkIndex = Math.floor((global.player.left() * CONFIG.ROW_COUNT) / global.width);
				var rightBlkIndex = Math.floor((global.player.right() * CONFIG.ROW_COUNT) / global.width);

				//is the ball over filled block(s)?
				if(this.blocks[leftBlkIndex].active && this.blocks[rightBlkIndex].active){
					global.player.vy = vy;;
				}
				//is the ball over one filled and one unfilled block
				else if(this.blocks[leftBlkIndex].active || this.blocks[rightBlkIndex].active){
					var activeBlk = this.blocks[leftBlkIndex].active ? this.blocks[leftBlkIndex].block : this.blocks[rightBlkIndex].block;
					var xdiff = this.blocks[leftBlkIndex].active ? global.player.x - activeBlk.right() : activeBlk.left() - global.player.x;
					var ydiff = global.player.y - activeBlk.bottom();
					var dist = util.findHypotenuse(xdiff, ydiff); //distance from player center to block edge

					if(xdiff <= 0 || (ydiff>0 && dist <= global.player.radius) ){
						global.player.vy = vy;
					} 
				}
				//DEFAULT: ball is over empty block(s)
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
			var y = 0;
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
		},
		update: function(){
			if(global.player.y - global.player.radius <= this.blockDim.height){
				var blk = this.blocks[Math.floor(global.player.x * CONFIG.ROW_COUNT/global.width)];
				if(!blk){
					console.warn(global.player.x, CONFIG.ROW_COUNT, global.width, this.blocks, blk);
				}
				blk.active = true;
				blk.block.fillStyle = 'rgb(20,100,200)';
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
	
		var count = CONFIG.ROW_COUNT;//row count
		
		//rows
		var totRows = Math.floor((global.height/((global.width/count)/2))/3);
		for(var i=0 ; i<totRows ; i++){
			list.push(new movingblockrow({
				count: count, 
				y: i * Math.floor(global.height/totRows),
				vy: global.block_vy,
				p: 0.25
			}));
		}
		
		//goal row
		global.goalRow = new goalblockrow({
			count: count			
		});
		list.push(global.goalRow);
		
		//player
		global.player = new player({
			x: global.width/2,
			y: (global.height)/4,
			radius: (global.width/count)/Math.PI,
			fillStyle: 'rgb(125,200,100)'
		});
		list.push(global.player);
	};

	var draw = function(){
		var ctx = global.context;
		var list = global.toDraw;

		//ctx.globalCompositeOperation = 'destination-over';
		ctx.clearRect(0,0,global.canvas.width(),global.canvas.height());

		list.each(function(obj){ 
			if(obj.draw){ 
				obj.draw(ctx); 
			}
		});
	};

	var update = function(){
		var list = global.toDraw;
		global.playerFallThisTick = true;

		list.each(function(obj){
			if(obj.update){
				obj.update();
			}
		});
	};

	var game_run = (function(){
		var loops = 0, 
			skip_ticks = 1000 / global.fps,
			max_frame_skip = 10,
			next_game_tick = (new Date).getTime();

		return function(){
			loops = 0;

			while ((new Date).getTime() > next_game_tick && loops < max_frame_skip){
				update();
				next_game_tick += skip_ticks;
				loops++;
			}
				if(loops){
					draw()
				};
		};
	})();

	$("document").ready(function(event){
		initCanvas();

		initObjects();

		(function() {
			var onEachFrame;
			if (window.webkitRequestAnimationFrame) {
				onEachFrame = function(cb) {
					var _cb = function() { cb(); webkitRequestAnimationFrame(_cb); }
					_cb();
				};
			} else if (window.mozRequestAnimationFrame) {
				onEachFrame = function(cb) {
					var _cb = function() { cb(); mozRequestAnimationFrame(_cb); }
					_cb();
				};
			} else {
				onEachFrame = function(cb) {
					setInterval(cb, 1000 / global.fps);
				}
			}
			window.onEachFrame = onEachFrame;
		})();

		window.onEachFrame(game_run);

		//input events
		$(document).keydown(function(event){
			switch(event.keyCode){
				case 37: 
				case 65:
				case 100:
					global.inputstate.left = true; //replace with time
					break;
				case 39:
				case 68:
				case 102:
					global.inputstate.right = true; //replace with time
					break;
				default:
					break;
			}
		}).keyup(function(event){
		switch(event.keyCode){
				case 37: 
				case 65:
				case 100:
					global.inputstate.left = false; //replace with delete
					break;
				case 39:
				case 68:
				case 102:
					global.inputstate.right = false; //replace with delete
					break;
				default:
					break;
			}
		});
	});

}(jQuery));
