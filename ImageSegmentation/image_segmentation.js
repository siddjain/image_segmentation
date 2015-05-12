var Segment = (function () {
    function Segment() {
    }
    return Segment;
})();
var App = (function () {
    function App(canvas1, canvas2) {
        this._canvas1 = document.getElementById(canvas1);
        this._canvas2 = document.getElementById(canvas2);
    }
    App.prototype.uploadImage = function (ev) {
        var _this = this;
        var reader = new FileReader();
        reader.onload = function (event) {
            var img = new Image();
            img.onload = function () {
                var canvas = _this._canvas1;
                var ctx = canvas.getContext("2d");
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                App._clearCanvas(_this._canvas2);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(ev.target.files[0]);
    };
    App._clearCanvas = function (canvas) {
        var width = canvas.width;
        var height = canvas.height;
        canvas.getContext("2d").clearRect(0, 0, width, height);
    };
    App.prototype.segment = function (tolerance) {
        this._tolerance = tolerance / 100 * 255;
        var canvas = this._canvas1;
        var canvas2 = this._canvas2;
        var width = canvas.width;
        var height = canvas.height;
        var n = width * height;
        this._remainder = n;
        var ctx = canvas.getContext("2d");
        this._bmpData1 = ctx.getImageData(0, 0, width, height).data;
        this._mask = new Array(height);
        for (var i = 0; i < height; i++) {
            this._mask[i] = new Array(width);
        }
        var segments = new Array();
        this._segmentId = 0;
        while (this._remainder) {
            this._segment = new Segment();
            segments.push(this._segment);
            this._initialize();
            while (this._index < this._qx.length) {
                var x = this._qx[this._index];
                var y = this._qy[this._index];
                this._segmentPixel(x, y);
                this._index++;
            }
            for (i = 0; i < this._qx.length; i++) {
                x = this._qx[i];
                y = this._qy[i];
                var k = (y * this._cols + x) * 4;
                for (var j = 0; j < this._channels; j++) {
                    this._bmpData2[k++] = this._segment.mean[j];
                }
            }
            this._segmentId++;
        }
        canvas2.width = width;
        canvas2.height = height;
        var ctx2 = canvas2.getContext("2d");
        var imgData2 = ctx2.createImageData(width, height);
        this._bmpData2 = imgData2.data;
        ctx2.putImageData(imgData2, 0, 0);
    };
    App.prototype._initialize = function () {
        var i = Math.round(Math.random() * this._remainder);
        var x = -1;
        var y = -1;
        var j = 0;
        for (var row = 0; row < this._rows; row++) {
            for (var col = 0; col < this._cols; col++, j++) {
                if (this._mask[row][col] > 0 && j === i) {
                    x = col;
                    y = row;
                    break;
                }
            }
        }
        this._qx = [x];
        this._qy = [y];
        this._index = 0;
    };
    App.getRandomInt = function (start, end) {
        return start + Math.round(Math.random() * (end - start));
    };
    App.prototype._segmentPixel = function (x, y) {
        var color = this._getColor(this._bmpData1, x, y);
        var max = 0;
        var i = 0;
        var segment = this._segment;
        for (i = 0; i < this._channels; i++) {
            var diff = Math.abs(color[i] - segment.mean[i]);
            if (diff > max) {
                max = diff;
            }
        }
        if (max <= this._tolerance || segment.pixels === 0) {
            this._mask[y][x] = this._segmentId;
            this._remainder--;
            segment.pixels++;
            for (i = 0; i < this._channels; i++) {
                segment.sum[i] += color[i];
                segment.mean[i] = segment.sum[i] / segment.pixels;
            }
            var neighbors = this._getNeighbors(x, y);
            for (i = 0; i < neighbors.count; i++) {
                this._qx.push(neighbors.x[i]);
                this._qy.push(neighbors.y[i]);
            }
        }
    };
    App.prototype._getColor = function (imageData, x, y) {
        var k = (y * this._cols + x) * 4;
        return [imageData[k], imageData[k + 1], imageData[k + 2], imageData[k + 3]];
    };
    App.prototype._getNeighbors = function (x, y) {
        var u = [];
        var v = [];
        this._test(x - 1, y, u, v);
        this._test(x + 1, y, u, v);
        this._test(x, y - 1, u, v);
        this._test(x, y + 1, u, v);
        return { x: u, y: v, count: u.length };
    };
    App.prototype._test = function (x, y, u, v) {
        if (x >= 0 && x < this._cols && y >= 0 && y < this._rows) {
            u.push(x);
            v.push(y);
        }
    };
    return App;
})();
window.onload = function () {
    var app = new App("canvas1", "canvas2");
    var vm = {
        uploadImage: function (data, event) {
            app.uploadImage(event);
        },
        segment: function () {
            app.segment(vm.tolerance());
        },
        tolerance: ko.observable(10)
    };
    ko.applyBindings(vm);
};
//# sourceMappingURL=image_segmentation.js.map