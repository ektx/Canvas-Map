/*
	cmap
	地图信息流向图
	-----------------------------------
	@version: 0.5.0
	@author: ektx
	@date: 2017-5-13

	------------------------------------
	API

*/
class CMap {

	constructor(obj) {

		this.options = obj;
		this.cityArr = obj.city;
		this.cityArea = obj.cityArea;
		this.message = obj.message;
		this.callback = obj.callback;

		// 数据整理后的地图区域信息
		this.areas = [];

		this.ele = document.querySelector( obj.el );
		this.ctx = '';
		this.ctxW = 0;
		this.ctxH = 0;

		// 鼠标移动位置
		this.currentX = -1;
		this.currentY = -1;
		// y 起点
		this.yStart = 0;
		// x 起点
		this.xStart = 0;

		// 当前索引
		this.inAreaCtx = -1;
		// 默认缩放
		this.minScale = 1;
		// devicePixelRatio
		this.DPI = window.devicePixelRatio;
		// 是否缩放(可配置)
		this.canScale = true;

		this.Mirror = {
			ele : {},
			canvas: {}
		}
	}


	setCtxState(styleOption, ctx) {

		let isCtx = ctx ? 1: 0;
		ctx = ctx || this.ctx;

		ctx.save();
		ctx.beginPath();

		// canvas 属性请查阅 canvas 相关书籍
		for ( let i in styleOption) {
			if (this.DPI > 1) {

				switch (i) {
					case 'font':
						if (!styleOption._font) {

							styleOption._font = 1;

							let strArr = styleOption[i].match(/([\d\.]+)(px|em)/);
							let size = parseFloat(strArr[1]);
							let unit = strArr[2];

							styleOption.font = styleOption[i].replace(strArr[0], size* this.DPI + unit);
						}

				}
			}

			ctx[i] = styleOption[i]
		}

		if (isCtx)
			return ctx;

	}

	drawLine(_options, ctx) {

		ctx = ctx || this.ctx;
		this.setCtxState( _options.style, ctx );

		// 没有数据不绘制
		if (_options.line.length === 0) return;

		let path;

		if (typeof _options.line === 'string') {
			let _city = _options.line[_options.index];

			path = new Path2D(_options.line);

			if( ctx.isPointInPath(path, this.currentX, this.currentY) ){
				ctx.fillStyle = _options.style.hoveColor;
				this.inAreaCtx = _options.index;
			} 

			ctx.stroke( path );
			ctx.fill( path )

		} else {
			for (let i = 0, l = _options.line.length; i < l; i+=2) {
				let x = _options.line[i];
				let y = _options.line[i+1];
				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			if( ctx.isPointInPath( this.currentX, this.currentY)){
				ctx.fillStyle = _options.style.hoveColor;
				this.inAreaCtx = _options.index;
			}

			ctx.stroke();
			ctx.fill();
		}

		ctx.closePath();
		ctx.restore();

		return ctx

	}


	getRandomPoint( _obj ) {
		let result = [];
		let _self = this;
		let _useCenterPoint = _obj.point.notUseCentroidPoint ? false : true;

		let getRandomVal = (colorArr) => (
			colorArr[parseInt(colorArr.length * Math.random())]
		)

		// 取多个点时,我们随机生成
		if (_obj.point.size > 1 || !_useCenterPoint) {
			
			for (let i = 0; i < _obj.point.size; i ++) {

				let x = 0;
				let y = 0;

				if (typeof _obj.data === 'string') {

					do {
						x = parseFloat((_obj.x[0] + _obj.width * Math.random()).toFixed(2));
						y = parseFloat((_obj.y[0] + _obj.height * Math.random()).toFixed(2));
					} while (!_self.ctx.isPointInPath(new Path2D(_obj.data), x, y));
				} else {
					do {
						x = parseFloat((_obj.x[0] + _obj.width * Math.random()).toFixed(2));
						y = parseFloat((_obj.y[0] + _obj.height * Math.random()).toFixed(2));
					} while (!_self.ctx.isPointInPath(x, y));
				}

				result.push({
					x: x,
					y: y,
					r: getRandomVal( _obj.point.r ),
					color: getRandomVal( _obj.point.color )
				})
			}
		} 
		// 只取一个点时,用中心点
		else {
			result.push({
				x: _obj.centroidX,
				y: _obj.centroidY,
				r: getRandomVal( _obj.point.r ),
				color: getRandomVal( _obj.point.color )
			})
		}
		_obj.pointArr = result;
	}

	drawPoint( obj ) {

		let pointLength = obj.pointArr.length;

		// 没有地图点数据不绘制
		if (obj.data.length === 0) {
			let _meg = '发现没有地图坐标点的城市:' + obj.name;
			
			if (!obj.warn.drawPoint) {
				obj.warn.drawPoint = _meg;
				console.warn( _meg )
			}

			return;	
		}

		if ( pointLength == 0) {
			this.getRandomPoint( obj );

			pointLength = obj.point.size;
		}

		for (let i = 0; i < pointLength; i++) {

			let _thisPoint = obj.pointArr[i];
			let _newColor = false;
			let _newR = false;

			if (obj.point.fun && typeof obj.point.fun === "function") {
				let _r = obj.point.fun(_thisPoint, obj) || false;

				if (_r) {
					_thisPoint.r = _r.r;
					_thisPoint.color = _r.color;			
				}
			}

			this.setCtxState( {
				fillStyle: _thisPoint.color
			} );

			this.ctx.arc(_thisPoint.x, _thisPoint.y, _thisPoint.r, 0, 2*Math.PI, false);


			this.ctx.fill();
			this.ctx.closePath();
			this.ctx.restore();

			if (obj.point.pop) this.drawPointPop(_thisPoint, obj.point.pop);

			// 点上线
			this.drawMessage( _thisPoint );

		}
	}

	drawPointPop( _point, _size ) {

		let _self = this;
		let _totalR = _point.r * 5;
		let popR = [];

		_size++;

		let popAnimateFun = function( r, speed ) {
			r += speed;
			r = r >= _totalR ? 0  : r;

			if ( r < 0 ) return r;

			_self.setCtxState({
				strokeStyle: _point.color,
				globalAlpha: 1-(r / _totalR)
			});
			_self.ctx.arc(_point.x, _point.y, r, 0, 2*Math.PI, false);
			_self.ctx.stroke();
			_self.ctx.closePath();
			_self.ctx.restore();

			return r;
		}

		if (!_point.popAnimate) {
			// 取波纹数
			if (_size > 1) {
				let _step = (_totalR + _point.r) / _size;

				for (let i = 0; i < _size-1; i++) {
					popR.push(i * _step)
				}
			} else {
				popR.push(_point.r)
			}

			_point.popAnimate = {
				r : popR,
				RSpeed: _totalR / 200
			}
		} else {
			for (let i = 0, l = _point.popAnimate.r.length; i < l; i++) {
				_point.popAnimate.r[i] = popAnimateFun( _point.popAnimate.r[i], _point.popAnimate.RSpeed );
			}
		}

	}

	
	drawMessage( _point ) {

		if (!this.message) return;

		let style = this.message.line;
		let _centerX = this.message.center.x, 
			_centerY = this.message.center.y;

		if (this.canScale) {
			if (!this.message.center._x) {
				this.message.center._x = _centerX * this.minScale + this.xStart;
				this.message.center._y = _centerY * this.minScale + this.yStart;
			}

			_centerX = this.message.center._x;
			_centerY = this.message.center._y;
		}

		// 1.绘制轨道
		this.drawLine({
			line: [_point.x, _point.y, _centerX, _centerY],
			style: style
		});

		if (!_point.lineLength) {

			_point.lineLength = parseFloat(Math.sqrt(Math.pow(_point.x, 2) + Math.pow(_point.y, 2)).toFixed(2));
			_point.width = _centerX - _point.x;
			_point.height = _centerY - _point.y;
			_point.xScale = _point.width / _point.lineLength;
			_point.yScale = _point.height / _point.lineLength;
			
			let speedRandom = Math.random() + .02;
			let _x = _point.x;
			let _xspeed = _point.width / this.message.speed * speedRandom;
			let _y = _point.y;
			let _yspeed = _point.height / this.message.speed * speedRandom;
			let cosA =  _point.height / _point.lineLength;
			let sinA = _point.width / _point.lineLength;
			
			if (this.message.direction == 'get') {
				_x = _centerX;
				_y = _centerY;
				_xspeed = 0 - _xspeed;
				_yspeed = 0 - _yspeed;
			}

			_point.light = {
				x: _x, // 原点 x
				y: _y, // 原点 y
				xs: _xspeed,
				ys: _yspeed,
				cos: cosA,
				sin: sinA,
				color: this.message.light.style.strokeStyle,
				bcolor: this.message.backColor || this.message.light.style.strokeStyle,
				t: 0
			}
		}


		let xStart = _point.light.x + _point.light.xs * _point.light.t;
		let yStart = _point.light.y + _point.light.ys * _point.light.t;

		let xEnd = xStart + this.message.light.length * _point.light.sin;
		let yEnd = yStart + this.message.light.length * _point.light.cos;

		if ( Math.abs(xStart - _point.light.x) > Math.abs(_point.width)) {
			_point.light.t = 0;

			if ( this.message.willback ) {
				// 切换方向
				if (_point.light.x === _point.x) {
					_point.light.x = _centerX;
					_point.light.y = _centerY;
					_point.light.xs = 0 - _point.light.xs;
					_point.light.ys = 0 - _point.light.ys;
				} 
				else if (_point.light.x === _centerX) {
					_point.light.x = _point.x;
					_point.light.y = _point.y;
					_point.light.xs = 0 - _point.light.xs;
					_point.light.ys = 0 - _point.light.ys;
				}

				// 切换颜色
				if (this.message.backColor) {
					let _color = _point.light.color;
					_point.light.color = _point.light.bcolor;
					_point.light.bcolor = _color;
				}

			}
		}

		// 流入效果
		if (_point.light.x === _point.x) {
			if (Math.abs(xEnd - _point.light.x) > Math.abs(_point.width)) {
				xEnd = _centerX;
				yEnd = _centerY;
			}
		} 
		else if (_point.light.x === _centerX) {
			if (Math.abs(xEnd - _point.x) > Math.abs(_point.width)) {
				xEnd = _point.light.x;
				yEnd = _point.light.y;
			}
		}

		this.message.light.style.globalCompositeOperation = 'source-over';
		this.message.light.style.strokeStyle = _point.light.color;

		_point.light.t++;

		this.drawLine({
			line: [
				xStart, 
				yStart, 
				xEnd, 
				yEnd, 
			],
			style: this.message.light.style
		}) 

	}

	drawCityName( _opt, index ) {
		// x 偏移
		let translateX = 0;
		// y 偏移
		let translateY = 0;

		if( this.inAreaCtx == index ){
			let _style = _opt.cityName.hover ? _opt.cityName.hover : _opt.cityName.normal;

			_style.globalCompositeOperation = 'source-over';

			this.setCtxState( _style );
		} else {
			_opt.cityName.normal.globalCompositeOperation = 'source-over';

			this.setCtxState( _opt.cityName.normal );
		}

		this.ctx.textAlign = _opt.cityName.align || 'center';

		if (_opt.cityName.move) {
			translateX = _opt.cityName.move.x ? _opt.cityName.move.x : 0;
			translateY = _opt.cityName.move.y ? _opt.cityName.move.y : 0;
		}

		this.ctx.fillText(_opt.name, _opt.xCenter + translateX, _opt.yCenter + translateY);
		
		this.ctx.restore();

	}

	// drawCityArea( _opt ) {

	// 	let style = this.cityArea.style;

	// 	let drawArea = (style, data) => {

	// 		for (let i = 0, l = data.length; i < l; i++) {
	// 			this.drawLine({
	// 				line: data[i],
	// 				style: style,
	// 				_area: true
	// 			})
	// 		}
	// 	}
	// 	// 重置
	// 	this.inAreaCtx = -1

	// 	drawArea({
	// 		fillStyle: style.shadowColor ||'transparent',
	// 		globalCompositeOperation: 'destination-over',
	// 		lineWidth: style.lineWidth,
	// 		strokeStyle: style.strokeStyle,
	// 		shadowBlur: style.shadowBlur,
	// 		shadowColor: style.shadowColor || 'transparent',
	// 		shadowOffsetX: style.shadowOffsetX || 0,
	// 		shadowOffsetY: style.shadowOffsetY || 0
	// 	}, this.cityArea.data)

	// 	drawArea({
	// 		fillStyle: 'transparent',
	// 		lineWidth: style.lineWidth,
	// 		strokeStyle: style.strokeStyle

	// 	}, this.cityArea.data)
		

	// }

	cityAreaCanvas () {

		if (!('cityArea' in this.Mirror.ele)) {

			this.Mirror.ele.cityArea = document.createElement('canvas');
			this.Mirror.ele.cityArea.width = this.ctxW;
			this.Mirror.ele.cityArea.height = this.ctxH;
		}

		let ctx = this.Mirror.ele.cityArea.getContext('2d');

		let style = this.cityArea.style;

		let drawArea = (style, data) => {

			for (let i = 0, l = data.length; i < l; i++) {
				ctx =  this.drawLine({
					line: data[i],
					style: style,
					_area: true
				}, ctx)
			}

			return ctx;
		}
		

		ctx = drawArea({
			fillStyle: style.shadowColor ||'transparent',
			globalCompositeOperation: 'destination-over',
			lineWidth: style.lineWidth,
			strokeStyle: style.strokeStyle,
			shadowBlur: style.shadowBlur,
			shadowColor: style.shadowColor || 'transparent',
			shadowOffsetX: style.shadowOffsetX || 0,
			shadowOffsetY: style.shadowOffsetY || 0
		}, this.cityArea.data)

		ctx = drawArea({
			fillStyle: 'transparent',
			lineWidth: style.lineWidth,
			strokeStyle: style.strokeStyle

		}, this.cityArea.data)

		// return canvas
	}

	cityMirror() {
		let canvas = document.createElement('canvas');
		canvas.width = this.ctxW;
		canvas.height = this.ctxH;

		let ctx = canvas.getContext('2d');

		ctx.fillStyle = `rgb(${~~(Math.random() * 255)}, ${~~(Math.random() * 255)},0)`;
		ctx.beginPath();
		ctx.arc(100, 100, 50, 0, Math.PI*2, false);
		ctx.closePath()
		ctx.fill();


		for (let i = 0, l = _self.areas.length; i < l; i++) {
				let n = _self.areas[i];
				let __style = n.style;
				__style.globalCompositeOperation = 'destination-over';

				if (_self.minScale > 1 && /-/g.test(n.data.toString()) ) {
					if (! ('drawLine' in n.warn)) {

						let warnMeg = 'SVG Path 数据在缩放情况下不绘制';
						n.warn.drawLine = warnMeg;
						console.warn( warnMeg );
					}
				
				} else {

					for (let x = 0, y = n.data.length; x < y; x++) {

						_self.drawLine({
							line: n.data[x],
							style: __style,
							index: i
						})

					}

					// _self.drawPoint( n );

					// _self.drawCityName( n, i )				

				}

			}

		return canvas
	}


	animate() {
		let _self = this;
		let cityAreaCanvas = _self.cityAreaCanvas();

		// _self.Mirror = {
		// 	cityMirror : _self.cityMirror()
		// }

		let go = function() {

			_self.ctx.clearRect(0, 0, _self.ctxW, _self.ctxH);

			// 重置地区索引
			_self.inAreaCtx = -1

			// _self.drawCityArea();

			// 背景
			_self.ctx.drawImage(_self.Mirror.ele.cityArea, 0,0)

			// 下辖
			// _self.ctx.drawImage(_self.Mirror.cityMirror, 0,0)

			

			// _self.drawCityArea();

			
			requestAnimationFrame( go );
		}

		go()


	}

	claerMultiPolygon(data) {
		let result = [];

		if ( /MULTIPOLYGON/gi.test(data.toString()) ) {

			let arr = data.match(/\(\(.+?\)\)/g);

			for (let i = 0, l = arr.length; i < l; i++) {
				result.push( arr[i].match(/[\d\.]+/g) )
			}
		} else {
			result = data
		}

		return result

	}

	/* 
		计算属性
	*/
	computedData( dataArr ) {

		if (!dataArr) {
			console.warn("Don't find any Data")
			return
		}

		// 验证数据合法,防止浏览器崩溃
		if (typeof dataArr[0] !== 'object') {
			console.warn('数据格式不正确,请参考示例文件或github!\n\rhttps://github.com/ektx/Canvas-Map')
			return;
		}

		let width = 0,
			height = 0,
			xStart = 0,
			yStart = 0,
			xEnd = 0,
			yEnd = 0,
			xArr = [],
			yArr = [];
		let data = [];

		data = dataArr.join(',').split(',');

		let centroid = this.getCentroid( data );

		for (let i = 0, l = data.length; i < l; i+=2) {
			let x = data[i];
			let y = data[i+1];

			if (i === 0) {
				xStart = xEnd = x;
				yStart = yEnd = y;
			}

			xArr.push(x);
			yArr.push(y);
		}

		xStart = Math.min.apply({}, xArr);
		xEnd = Math.max.apply({}, xArr);

		yStart = Math.min.apply({}, yArr);
		yEnd = Math.max.apply({}, yArr);

		// 输出宽高
		width = ~~(xEnd - xStart);
		height = ~~(yEnd - yStart);

		return {
			width: width,
			height: height,
			xCenter: ~~(xStart + width / 2),
			yCenter: ~~(yStart + height / 2),
			centroidX: centroid[0],
			centroidY: centroid[1],
			x: [xStart, xEnd],
			y: [yStart, yEnd]
		}
	}

	// 质点中心 代码参考网上
	getCentroid( arr ) {
		let twoTimesSignedArea = 0;
	    let cxTimes6SignedArea = 0;
	    let cyTimes6SignedArea = 0;

	    let length = arr.length

	    for ( let i = 0, l = arr.length; i < l; i+=2) {

	        let _x = parseFloat(arr[i]);
	        let _y = parseFloat(arr[i+1]);
	        let __x = parseFloat(arr[i+2]);
	        let __y = parseFloat(arr[i+3]);

	        if (i + 3 > arr.length) {
	        	__x = parseFloat(arr[0]);
	        	__y = parseFloat(arr[1]);
	        }

	        let twoSA = _x * __y - __x * _y;

	        twoTimesSignedArea += twoSA;
	        cxTimes6SignedArea += (_x + __x) * twoSA;
	        cyTimes6SignedArea += (_y + __y) * twoSA;
	    }
	    
	    let sixSignedArea = 3 * twoTimesSignedArea;

	    return [ ~~(cxTimes6SignedArea / sixSignedArea), ~~(cyTimes6SignedArea / sixSignedArea)]; 
	}

	event() {

		let _self = this;
		let mousemoveTime = 0;

		//地图鼠标移上去的事件
		this.ele.addEventListener("mousemove", function(event){
			_self.currentX = event.offsetX * window.devicePixelRatio;
			_self.currentY = event.offsetY * window.devicePixelRatio;

			// 减少绘制,提高性能
			if (new Date() - mousemoveTime > 160) {
				
				mousemoveTime = new Date();

				_self.Mirror = {
					cityMirror : _self.cityMirror()
				}
			}

			// 在地图区域内
			if (_self.inAreaCtx > -1) {
				// 返回用户 数据索引 城市信息
				if (_self.callback && _self.callback.mousemove) _self.callback.mousemove( _self.inAreaCtx, _self.areas[_self.inAreaCtx], event );
			} 
			// 在地图外
			else {
				// 返回用户 -1
				if (_self.callback && _self.callback.mousemove) {
					_self.callback.mousemove( -1, event );
				}
			}

		});

		// 地图上点击事件
		this.ele.addEventListener('click', function(e) {
			// 在地图区域内
			if (_self.inAreaCtx > -1) {

				if (_self.callback && _self.callback.click) 
					_self.callback.click( _self.inAreaCtx , _self.areas[_self.inAreaCtx], e );
			}
		})
	}

	// 自动调整地图大小
	autoSize() {

		let _self = this;
		let mapSizeInfo = '';
		let cityArealineW = _self.cityArea.style.lineWidth * 2;

		let dataClear = function( mapSizeInfo ) {

			let minX = mapSizeInfo.x[0];
			// y轴使用的是地球坐标还是平面坐标
			let minY = _self.cityArea.earthLine ? mapSizeInfo.y[1] : mapSizeInfo.y[0];
			// 地图宽度
			let mapW = mapSizeInfo.width * _self.minScale;
			// 地图高度
			let mapH = mapSizeInfo.height * _self.minScale;

			// 让地图居中 
			// y 起点 = (canvas宽度 - 地图的宽度)/2
			_self.yStart = (_self.ctxH - mapH)/2;
			// x 起点 = (canvas高度 - 地图的高度)/2
			_self.xStart = (_self.ctxW - mapW)/2;

			let setData = ( data ) => {
				for (let i = 0, l = data.length; i < l; i+=2) {
					if (typeof data[i] == 'object') {
						data[i] = setData( data[i] )
					} else {
						data[i] = ~~(_self.xStart + (data[i] - minX) * _self.minScale);
						// 地图居中显示
						if (_self.cityArea.earthLine)
							data[i+1] = ~~(_self.yStart + (minY - data[i+1]) * _self.minScale);
						else 
							data[i+1] = ~~(_self.yStart + (data[i+1] - minY) * _self.minScale);
							
					}
				}
				return data;
			}

			let doWithArr = (data) => {
				if ( /-/g.test( data.toString()) ) {
					console.warn('data 要是数组或SVG无法放大!');
					return data;
				}

				for (let i = 0, l = data.length; i < l; i++) {
					data[i] = setData( data[i] )
				}
			}

			// 对边界处理
			doWithArr( _self.options.cityArea.data )

			// 对下辖处理
			for (let c = 0, d = _self.options.city.data.length; c < d; c++) {
				_self.options.city.data[c].map = _self.claerMultiPolygon(_self.options.city.data[c].map)
				doWithArr( _self.options.city.data[c].map )
			}
		}

		// SVG 不进行数据的优化处理
		if (/-/g.test( this.options.cityArea.data.toString() ) ) return;

		_self.options.cityArea.data = _self.claerMultiPolygon(_self.options.cityArea.data)
		mapSizeInfo = _self.computedData( _self.options.cityArea.data )

		_self.minScale = Math.min((_self.ctxW - cityArealineW) / mapSizeInfo.width, (_self.ctxH - cityArealineW)/ mapSizeInfo.height);

		dataClear( mapSizeInfo )

	}

	setArea() {

		let _self = this;

		let Area = function(index, obj, computedData, cityInfo) {
			let hasX = 'x' in computedData;

			if (!obj.name) {
				obj.name = ''
				console.warn("没有名称的下辖索引为:", index +1);
			}

			this.centroidX = computedData.centroidX;
			this.centroidY = computedData.centroidY;
			this.cityName = cityInfo.cityName;
			this.data = obj.map || [];

			this.height = obj.h || computedData.height;
			this.width = obj.w || computedData.width;
			this.name = obj.name;
			
			this.x = hasX ? computedData.x : [obj.x, obj.x + obj.w];
			this.y = hasX ? computedData.y : [obj.y, obj.y + obj.h];
			this.xCenter = hasX ? computedData.xCenter : obj.x + obj.w /2;
			this.yCenter = hasX ? computedData.yCenter : obj.y + obj.h /2;

			this.point = cityInfo.point;
			this.pointArr = [];
			this.style = cityInfo.style;
			this.warn = {};  // 保存错误信息
			this.origin = obj
		};

		if (this.canScale) 
			this.autoSize();

		for (let i = 0, l = this.options.city.data.length; i < l; i++) {
			let _data = this.options.city.data[i];
			let _computedData = {};

			// 对 svg 的处理
			if ( /-/g.test(_data.map.toString()) ) {
				if (_data.map) {
					// 计算宽高
					_computedData = {
						centroidX: _data.x + (_data.w / 2),
						centroidY: _data.y + (_data.h / 2)
					}
				}
			} 
			else {
				if (_data.map) {
					// 计算宽高
					_computedData = this.computedData( _data.map )
				} else {
					console.warn('This city or area not have data:' + _data.name);
					return;
				}
			}

			this.areas[i] = new Area(i, _data, _computedData, this.options.city )
		}
	}

	createCanvas () {

		let canvas = document.createElement('canvas');
		let boxW = parseFloat( this.ele.style.width || window.getComputedStyle(this.ele, null).width );
		let boxH = parseFloat( this.ele.style.height || window.getComputedStyle(this.ele, null).height );

		canvas.width = this.ctxW = boxW * this.DPI;
		canvas.height = this.ctxH = boxH * this.DPI;

		if (this.DPI > 1) {
			canvas.style.width = boxW + 'px';
			canvas.style.height = boxH + 'px'
		}

		this.ele.appendChild( canvas );
		this.ctx = canvas.getContext('2d');

		window.requestAnimationFrame = (function() {
			return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback) {
				return window.setTimeout(callback, 1000/60);
			}
		})();
	}

	init() {

		this.createCanvas();

		this.setArea();

		this.animate();

		this.event();
	}

}
