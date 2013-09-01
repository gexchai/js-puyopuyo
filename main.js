enchant();

// フレームレート
var FPS = 30;

// 縦のマス数(プラスされているのは壁の分)
var MAX_ROW = 14+1;

// 横のマス数(プラスされているのは壁の分)
var MAX_COL = 6+2;

// マスのサイズ(ぷよのpxサイズ)
var CELL_SIZE = 16;

// ぷよのがぞう
var PUYOS_IMG = "puyos.png";

// 描画用のフィールド
var DRAW_FILED = new Array(MAX_ROW-2);

window.onload = function () {
    var game = new Game(320, 320);

    // フレームレートのセット
    game.fps = FPS;

    // ぷよ画像の読み込み
    game.preload(PUYOS_IMG);

    // スペースバーにAボタンを割り当て
    // 32にキーコード
    game.keybind(32, 'a');

    game.onload = function() {
        // 処理

        // game.rootSceneは長いのでsceneに割り当て
        var scene = game.rootScene;

        // フィールド描画用&当たり判定用マップ
        var map = new Map(16, 16);

        // フィールドの色のデータ
        // 配置が確定されたぷよの位置と情報を格納
        var field = new Array(MAX_ROW);

        // なにもない場合は「-1」
        // ブロックは「0」
        // 各色ぷよは「1」から「4」
        for (var i=0; i<field.length; i++) {
            var temp_array = [];
            for (var j=0; j<MAX_COL; j++) {
                // ブロック(壁)を配置
                if (j==0 || j==MAX_COL-1 || i==MAX_ROW-1) temp_array[j] = 0;
                // から
                else temp_array[j] = -1;
            }
            field[i] = temp_array;
        }

        // 描画用のフィールドにコピー
        copyDraw(field);

        // mapにぷよ画像を読みこませる
        map.image = game.assets[PUYOS_IMG];
        map.loadData(DRAW_FILED);
        scene.addChild(map);

        // 操作するぷよ２つを作成
        var pair = createPair(game, map, field);

        // 操作ぷよをシーンに追加
        scene.addChild(pair);

        // 1フレーム毎に呼び出される関数を登録
        scene.addEventListener("enterframe", function() {

            // 操作ぷよの着地判定
            if (!pair.isFall) {

                // 操作ぷよをシーンから削除
                scene.removeChild(pair);

                // 自由落下
                freeFall(field);

                // 連鎖処理
                chain(field);

                // 描画用フィールドにコピー
                copyDraw(field);

                // マップの再読み込み
                map.loadData(DRAW_FILED);

                // ゲームオーバー判定
                if (field[2][3] != -1) {
                    game.stop();
                    console.log("Game Over");
                } else {
                    /* 操作ぷよを更新、シーンに追加 */
                    pair = createPair(game, map, field);
                    scene.addChild(pair);
                }
            }
        });
    };
    game.start();
};


/**
 * 一つのぷよスプライトを返します。
 * 操作ぷよに使われます。
 * 色は4色からランダムに決定されます。
 *
 * @game {Game}
 * @return {Sprite} (0, 0)のランダムな色のぷよぷよ
 */
function createPuyo (game) {
    var puyo = new Sprite(CELL_SIZE, CELL_SIZE);
    puyo.image = game.assets[PUYOS_IMG];
    // ランダムに色を選択
    puyo.frame = Math.floor(Math.random()*4+1);
    puyo.moveTo(0, 0);
    return puyo;
}

/**
 * 操作ぷよ2つが含まれたグループを返します。
 * このグループは自動でY座標を更新し、
 * キー入力を受付け、それに応じて挙動を取ります。
 * 着地するとfieldに操作ぷよの情報を追加します。
 *
 * @game {Game}
 * @map {Map} フィールドを読み込むMapオブジェクト
 * 操作ぷよが着地したときに操作ぷよをフィールドに追加する。
 * @return {Group}操作ぷよ2つが含まれるグループ
 */
function createPair (game, map, field) {
    var pair = new Group();

    // 回る側の操作ぷよ
    var p0 = createPuyo(game);

    // 軸側の操作ぷよ
    var p1 = createPuyo(game);

    // 操作ぷよの形
    var forms = [[0, -CELL_SIZE], [CELL_SIZE, 0], [0, CELL_SIZE], [-CELL_SIZE, 0]];

    // 操作ぷよの形の番号。フォームナンバ
    var formNum = 0;

    /* キー押下カウント */
    var inputRightCount = 0;
    var inputLeftCount = 0;
    var inputUpCount = 0;
    var inputAccount = 0;
    var inputInterval = 3;

    // 落下中、つまり操作できる状態かどうか
    pair.isFall = true;

    // 操作ぷよをシーンに追加
    pair.addChild(p0);
    pair.addChild(p1);

    // 回る側のぷよの初期位置を軸ぷよの一つ上へ
    p0.y = -CELL_SIZE;

    // グループの初期位置を操作ぷよ出現場所へ
    pair.moveTo(CELL_SIZE*3, CELL_SIZE);

    pair.addEventListener("enterframe", function() {
        // フレーム毎の処理

        /* キー連続押下カウントの更新 */
        inputRightCount = game.input.right ? inputRightCount+1 : 0;
        inputLeftCount = game.input.left ? inputLeftCount+1 : 0;
        inputUpCount = game.input.up ? inputUpCount+1 : 0;
        inputACount = game.input.a ? inputACount+1 : 0;

        /* 回転 */
        if (inputACount == 1 || inputUpCount == 1) {
            // 回転した場合のフォームナンバ
            var newFormNum = (formNum+1) % 4;

            // 回転先のx
            var newX = forms[newFormNum][0];

            // 回転先のy
            var newY = forms[newFormNum][1];

            // 回転可能判定
            if (!map.hitTest(this.x+newX, this.y+newY)) {
                formNum = newFormNum;
                p0.moveTo(newX, newY);
            }
        }

        /* 横移動 */

        // 横移動先のx
        var newX = 0;
        if (inputRightCount % inputInterval == 1) {
            newX = formNum==1 ? p0.x+CELL_SIZE : p1.x+CELL_SIZE;
        }
        if (inputLeftCount % inputInterval == 1) {
            newX = formNum==3 ? p0.x-CELL_SIZE : p1.x-CELL_SIZE;
        }
        if (!map.hitTest(this.x+newX, this.y+p0.y) && !map.hitTest(this.x+newX, this.y+p1)) {
            this.x = this.x + (newX?newX>=0?1:-1:0)*CELL_SIZE;
        }

        /* 落下 */
        newY = formNum==2 ? p0.y+CELL_SIZE : p1.y+CELL_SIZE;

        // 落下速度の設定(10や1などの数値は何マス毎秒か
        var vy = Math.floor(game.input.down ? game.fps/15 : game.fps/1);

        if (game.frame%vy == 0) {

            // 移動可能判定
            if (!map.hitTest(this.x+p0.x, this.y+newY) && !map.hitTest(this.x+p1.x, this.y+newY)) {
                this.y += CELL_SIZE;
            } else {
                /* フィールドに操作ぷよを追加 */
                field[(this.y+p0.y)/CELL_SIZE][(this.x+p0.x)/CELL_SIZE] = p0.frame;
                field[(this.y+p1.y)/CELL_SIZE][(this.x+p1.x)/CELL_SIZE] = p1.frame;

                // 着地したので落下中フラグをfalseに
                pair.isFall = false;
            }
        }
    });
    return pair;
}


/**
 * 指定された場所から色がいくつか繋がっているかを返します。
 * 同じ色のぷよが隣接されていた場合は再帰呼び出しし、
 * 隣接されたぷよからの色の数を足していきます。
 *
 * @row {Number} 調べ始めるぷよの行
 * @col {Number} 調べ始めるぷよの列
 * @field {Array} フィールドの色情報が格納された２次元配列
 * @return {Number} 指定された場所からぷよがいくつ繋がっているか
 */
function countPuyos (row, col, field) {
    // ぷよの色
    var c = field[row][col];

    // 1で初期化しているのは自分もカウントするため。
    var n = 1;

    // この場所をチェックした証として一時的に空白に
    field[row][col] = -1;

    // c色をカウント
    if (row-1>=2 && field[row-1][col]==c) n += countPuyos(row-1, col, field);
    if (row+1<=MAX_ROW-2 && field[row+1][col]==c) n += countPuyos(row+1, col, field);
    if (col-1>=1 && field[row][col-1]==c) n += countPuyos(row, col-1, field);
    if (col+1<=MAX_COL-2 && field[row][col+1]==c) n += countPuyos(row, col+1, field);

    // 色を戻す
    field[row][col] = c;

    return n;
}


/**
 * 指定された場所のぷよを消します。
 * 隣接されたぷよが同じ色だった場合は再帰呼び出しし、
 * 消していきます。
 */
function deletePuyos (row, col, field) {
    // ぷよの色
    var c = field[row][col];

    // ぷよを空に
    field[row][col] = -1;

    // 消していく処理
    if (row-1>=2 && field[row-1][col]==c) deletePuyos(row-1, col, field);
    if (row+1<=MAX_ROW-2 && field[row+1][col]==c) deletePuyos(row+1, col, field);
    if (col-1>=1 && field[row][col-1]==c) deletePuyos(row, col-1, field);
    if (col+1<=MAX_COL-2 && field[row][col+1]==c) deletePuyos(row, col+1, field);
}


/**
 * 下が空いているぷよを落とした状態にするよう
 * フィールドを更新し、落ちたぷよの数を返します。
 *
 * @field {Array} フィールドの色情報が格納された二次元配列
 * @return {Number} 落ちたぷよの数
 */
function freeFall (field) {
    // おちたぷよの数
    var c = 0;

    for (var i=0; i<MAX_COL; i++) {
        var spaces = 0;
        for (var j=MAX_ROW-1; j>=0; j--) {
            if (field[j][i] == -1) spaces++;
            else if (spaces >= 1) { // 落ちるべきぷよがあった場合
                field[j+spaces][i] = field[j][i];
                field[j][i] = -1;
                c++;
            }
        }
    }
    return c;
}


/**
 * 連鎖処理を行います
 * 消去と自由落下を繰り返して連鎖を終了させます。
 * 自動落下が発生しなかった場合は再帰呼び出しをせずに終了します。
 *
 * @field {Array} フィールドの色情報が格納された２次元配列
 */
function chain (field) {
    for (var i=0; i<MAX_ROW; i++) {
        for (var j=0; j<MAX_COL; j++) {
            // つながっているぷよをカウントする変数を初期化
            var n = 0;

            // 同じ色のぷよが４つつながっていた場合
            if (field[i][j]>=1 && countPuyos(i, j, field)>=4) {

                // ぷよを消去
                deletePuyos(i, j, field);
            }
        }
    }

    // 自由落下したぷよが合った場合は再帰
    if (freeFall(field) >= 1) chain(field);
}


/**
 * 描画用フィールドにコピー
 *
 * @field {Array}
 */
function copyDraw(field) {
    for (var i=2; i<MAX_ROW; i++) {
        DRAW_FILED[i-2] = field[i];
    }
}
