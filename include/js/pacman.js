/**
 * fix looped audio
 * add fruits + levels
 * fix what happens when a ghost is eaten (should go back to base)
 * do proper ghost mechanics (blinky/wimpy etc)
 */


/**
 * Les variables globales
 */
var NONE        = 4,
    UP          = 3,
    LEFT        = 2,
    DOWN        = 1,
    RIGHT       = 11,
    WAITING     = 5,
    PAUSE       = 6,
    PLAYING     = 7,
    COUNTDOWN   = 8,
    EATEN_PAUSE = 9,
    DYING       = 10,
    Pacman      = {};

// propriété de la classe
Pacman.FPS = 30;// fluidité du jeu en nombre d'images par seconde

console.log("Pacman Lancement à "+Pacman.FPS+" fps");


/**
 * Gestion du jeu lui même
 * 
 * @param  {[type]} ) {               var state [description]
 * @return {[type]}   [description]
 */
var PACMAN = (function () 
{
    // les propriétés
    var state        = WAITING,
        audio        = null,
        ghosts       = [],
        ghostSpecs   = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"],
        eatenCount   = 0,
        level        = 0,
        tick         = 0,
        ghostPos, userPos, 
        stateChanged = true,
        timerStart   = null,
        lastTime     = 0,
        ctx          = null,
        timer        = null,
        map          = null,
        user         = null,
        stored       = null;


    function getTick() 
    { 
        return tick;
    };


    /**
     * Affiche le score du joueur
     * 
     * @param  {[type]} text     [description]
     * @param  {[type]} position [description]
     * @return {[type]}          [description]
     */
    function drawScore(text, position) 
    {
        ctx.fillStyle = "#FFFFFF";
        ctx.font      = "12px Arial";
        ctx.fillText(text, 
                     (position["new"]["x"] / 10) * map.blockSize, 
                     ((position["new"]["y"] + 5) / 10) * map.blockSize);
    }
    

    /**
     * Affiche un message à l'écran du joueur
     * 
     * @param  {[type]} text [description]
     * @return {[type]}      [description]
     */
    function dialog(text) {

        ctx.fillStyle = "#006eff"; // couleur du texte
        ctx.font      = "bold 16px Arial"; // style du texte
        
        var width = ctx.measureText(text).width,
            x     = ((map.width * map.blockSize) - width) / 2;        
        //ctx.fillText(text, x, (map.height * 10) + 8);

        var nSpace = 20;
        addTextBackground(ctx, 0, (map.height * 7), width+20, (map.height * 3), '#fff' ); 
        addMultiLineText(text, 10, (map.height * 8), nSpace, width, ctx);
    }


    /**
     * Permet de savoir si le son est actif ou non
     * 
     * @return {[type]} [description]
     */
    function soundDisabled() 
    {
        return localStorage["soundDisabled"] === "true";
    };
    

    /**
     * Lancement d'un niveau
     * 
     * @return {[type]} [description]
     */
    function startLevel()
    {        
        user.resetPosition();

        for (var i = 0; i < ghosts.length; i += 1)
        { 
            ghosts[i].reset();
        }

        audio.play("start");
        timerStart = tick;
        setState(COUNTDOWN);
    }    


    /**
     * Commence une nouvelle partie
     * 
     * @return {[type]} [description]
     */
    function startNewGame() 
    {
        setState(WAITING);
        level = 1;
        user.reset();
        map.reset();
        map.draw(ctx);
        startLevel();
    }


    /**
     * Ecoute les touches pressées par le joueur
     * 
     * @param  {[type]} e [description]
     * @return {[type]}   [description]
     */
    function keyDown(e) 
    {
        // touche N pour lancer le jeu
        if (e.keyCode === KEY.N)
            startNewGame();
        // touche S pour désactiver l'audio du jeu
        else if (e.keyCode === KEY.S) 
        {
            audio.disableSound();
            localStorage["soundDisabled"] = !soundDisabled();
        } 
        // touche P pour passer de la pause à la reprise du jeu
        else if (e.keyCode === KEY.P && state === PAUSE) 
        {
            audio.resume();
            map.draw(ctx);
            setState(stored);
        } 
        // touche P pour mettre le jeu en pause
        else if (e.keyCode === KEY.P) 
        {
            stored = state;
            setState(PAUSE);
            audio.pause();
            map.draw(ctx);
            dialog("Pause");
        } 
        else if (state !== PAUSE)   
            return user.keyDown(e);

        return true;
    }    


    /**
     * Appel lorsque le joueur perd une vie
     * 
     * @return {[type]} [description]
     */
    function loseLife() 
    {        
        setState(WAITING);
        user.loseLife();

        if (user.getLives() > 0)
            startLevel();
    }

    function setState(nState)
    { 
        state = nState;
        stateChanged = true;
    };

    
    /**
     * Est-ce qu'il y a collision entre le pacman et un fantome ?
     * 
     * @param  {[type]} user  [description]
     * @param  {[type]} ghost [description]
     * @return {[type]}       [description]
     */
    function collided(user, ghost) 
    {
        return (Math.sqrt(Math.pow(ghost.x - user.x, 2) + 
                          Math.pow(ghost.y - user.y, 2))) < 10;
    };


    /**
     * Les informations pour le joueur en bas de l'interface
     * 
     * @return {[type]} [description]
     */
    function drawFooter() 
    {
        var topLeft  = (map.height * map.blockSize),
            textBase = topLeft + 17;
        
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, topLeft, (map.width * map.blockSize), 30);
        
        // dessin des vies restantes de pacman
        ctx.fillStyle = "#FFFF00";
        for (var i = 0, len = user.getLives(); i < len; i++)
        {
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.moveTo(150 + (25 * i) + map.blockSize / 2,
                       (topLeft+1) + map.blockSize / 2);
            
            ctx.arc(150 + (25 * i) + map.blockSize / 2,
                    (topLeft+1) + map.blockSize / 2,
                    map.blockSize / 2, Math.PI * 0.25, Math.PI * 1.75, false);
            ctx.fill();
        }

        // icône état du son - couleur si activé ou désactivé
        ctx.fillStyle = !soundDisabled() ? "#00FF00" : "#FF0000";
        ctx.font = "bold 20px Arial";
        ctx.fillText("♪", 10, textBase);

        // informations pour le joueur
        ctx.fillStyle = "#006eff";
        ctx.font      = "14px Arial";
        ctx.fillText("Votre Score: " + user.theScore(), 30, textBase);
        ctx.fillText("Niveau: " + level, 260, textBase);
    }


    function redrawBlock(pos) 
    {
        map.drawBlock(Math.floor(pos.y/10), Math.floor(pos.x/10), ctx);
        map.drawBlock(Math.ceil(pos.y/10), Math.ceil(pos.x/10), ctx);
    }

    function mainDraw() 
    { 
        var diff, u, i, len, nScore;
        ghostPos = [];

        for (i = 0, len = ghosts.length; i < len; i += 1) 
        {
            ghostPos.push(ghosts[i].move(ctx));
        }

        u = user.move(ctx);
        
        for (i = 0, len = ghosts.length; i < len; i += 1) 
        {
            redrawBlock(ghostPos[i].old);
        }

        redrawBlock(u.old);
        
        for (i = 0, len = ghosts.length; i < len; i += 1) 
        {
            ghosts[i].draw(ctx);
        }   

        user.draw(ctx);
        userPos = u["new"];
        
        for (i = 0, len = ghosts.length; i < len; i += 1)
        {
            if (collided(userPos, ghostPos[i]["new"])) 
            {
                if (ghosts[i].isVunerable()) 
                { 
                    audio.play("eatghost");
                    ghosts[i].eat();
                    eatenCount += 1;
                    nScore = eatenCount * 50;
                    drawScore(nScore, ghostPos[i]);
                    user.addScore(nScore);                    
                    setState(EATEN_PAUSE);
                    timerStart = tick;
                } 
                else if (ghosts[i].isDangerous()) 
                {
                    audio.play("die");
                    setState(DYING);
                    timerStart = tick;
                }
            }
        }                             
    };


    function mainLoop() 
    {
        var diff;

        if (state !== PAUSE)  
            ++tick;

        map.drawPills(ctx);

        if (state === PLAYING) 
            mainDraw();
        else if (state === WAITING && stateChanged) 
        {            
            stateChanged = false;
            map.draw(ctx);
            dialog("Appuyez sur la touche N pour commencer \nTouche P pour mettre le jeu en pause \nTouche S pour désactiver le son");
        } 
        else if (state === EATEN_PAUSE && 
                   (tick - timerStart) > (Pacman.FPS / 3)) 
        {
            map.draw(ctx);
            setState(PLAYING);
        } 
        else if (state === DYING) 
        {
            if (tick - timerStart > (Pacman.FPS * 2)) 
                loseLife();
            else 
            { 
                redrawBlock(userPos);

                for (i = 0, len = ghosts.length; i < len; i += 1)
                {
                    redrawBlock(ghostPos[i].old);
                    ghostPos.push(ghosts[i].draw(ctx));
                }     

                user.drawDead(ctx, (tick - timerStart) / (Pacman.FPS * 2));
            }
        } 
        else if (state === COUNTDOWN) 
        {
            diff = 4 + Math.floor((timerStart - tick) / Pacman.FPS);
            
            if (diff === 0) 
            {
                map.draw(ctx);
                setState(PLAYING);
            } 
            else 
            {
                if (diff !== lastTime) 
                { 
                    lastTime = diff;
                    map.draw(ctx);
                    dialog("Lancement du jeu dans " + diff);
                }
            }
        } 

        drawFooter();
    }

    /**
     * Pacman a mangé un citron
     * Il peut manger les fantomes
     * 
     * @return {[type]} [description]
     */
    function eatenPill() 
    {
        audio.play("eatpill");// changement de musique
        timerStart = tick;
        eatenCount = 0;

        // les fantomes deviennent mangeables
        for (i = 0; i < ghosts.length; i += 1)
        {
            ghosts[i].makeEatable(ctx);
        }        
    };
    

    /**
     * Niveau terminé par le joueur
     * 
     * @return {[type]} [description]
     */
    function completedLevel() 
    {
        setState(WAITING);
        level += 1;
        map.reset();
        user.newLevel();
        startLevel();
    };


    /**
     * Une touche est pressée par le joueur
     * 
     * @param  {[type]} e [description]
     * @return {[type]}   [description]
     */
    function keyPress(e)
    { 
        if (state !== WAITING && state !== PAUSE) 
        { 
            e.preventDefault();
            e.stopPropagation();
        }
    };
    

    /**
     * Lancement de la partie
     * 
     * @param  {[type]} wrapper [description]
     * @param  {[type]} root    [description]
     * @return {[type]}         [description]
     */
    function init(wrapper, root) 
    {
        var i, len, ghost,
            blockSize = wrapper.offsetWidth / 19,
            canvas    = document.createElement("canvas");
        
        canvas.setAttribute("width", (blockSize * 19) + "px");
        canvas.setAttribute("height", (blockSize * 22) + 30 + "px");

        wrapper.appendChild(canvas);

        ctx  = canvas.getContext('2d');

        // initialise toutes les classes du jeu
        audio = new Pacman.Audio({"soundDisabled":soundDisabled});
        map   = new Pacman.Map(blockSize);
        user  = new Pacman.User({ 
            "completedLevel" : completedLevel, 
            "eatenPill"      : eatenPill 
        }, map);

        for (i = 0, len = ghostSpecs.length; i < len; i += 1) 
        {
            ghost = new Pacman.Ghost({"getTick":getTick}, map, ghostSpecs[i]);
            ghosts.push(ghost);
        }
        
        map.draw(ctx);
        dialog("Chargement en cours...");

        // utilisation de l'audio au format mp3 ou ogg en fonction du navigateur
        var extension = Modernizr.audio.ogg ? 'ogg' : 'mp3';

        var audio_files = [
            ["start", root + "audio/opening_song." + extension],
            ["die", root + "audio/die." + extension],
            ["eatghost", root + "audio/eatghost." + extension],
            ["eatpill", root + "audio/eatpill." + extension],
            ["eating", root + "audio/eating.short." + extension],
            ["eating2", root + "audio/eating.short." + extension]
        ];

        load(audio_files, function() { loaded(); });
    };


    /**
     * Chargement des fichiers audio
     * 
     * @param  {[type]}   arr      [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    function load(arr, callback) 
    {   
        // appel larsque le chargement des fichiers est terminé
        if (arr.length === 0) 
            callback();
        else 
        { 
            var x = arr.pop();
            audio.load(x[0], x[1], function() { load(arr, callback); });
        }
    };
        

    /**
     * Chargement des fichiers audio terminés
     * Lancement de l'écran d'accueil du jeu
     * 
     * @return {[type]} [description]
     */
    function loaded() 
    {
        dialog("Appuyez sur la touche N pour commencer \n Touche P pour mettre le jeu en pause \n Touche S pour désactiver le son");            
        
        document.addEventListener("keydown", keyDown, true);
        document.addEventListener("keypress", keyPress, true); 
        
        timer = window.setInterval(mainLoop, 1000 / Pacman.FPS);
    };
    
    return {
        "init" : init
    };
    
}());

/* Human readable keyCode index */
var KEY = {'BACKSPACE': 8, 'TAB': 9, 'NUM_PAD_CLEAR': 12, 'ENTER': 13, 'SHIFT': 16, 'CTRL': 17, 'ALT': 18, 'PAUSE': 19, 'CAPS_LOCK': 20, 'ESCAPE': 27, 'SPACEBAR': 32, 'PAGE_UP': 33, 'PAGE_DOWN': 34, 'END': 35, 'HOME': 36, 'ARROW_LEFT': 37, 'ARROW_UP': 38, 'ARROW_RIGHT': 39, 'ARROW_DOWN': 40, 'PRINT_SCREEN': 44, 'INSERT': 45, 'DELETE': 46, 'SEMICOLON': 59, 'WINDOWS_LEFT': 91, 'WINDOWS_RIGHT': 92, 'SELECT': 93, 'NUM_PAD_ASTERISK': 106, 'NUM_PAD_PLUS_SIGN': 107, 'NUM_PAD_HYPHEN-MINUS': 109, 'NUM_PAD_FULL_STOP': 110, 'NUM_PAD_SOLIDUS': 111, 'NUM_LOCK': 144, 'SCROLL_LOCK': 145, 'SEMICOLON': 186, 'EQUALS_SIGN': 187, 'COMMA': 188, 'HYPHEN-MINUS': 189, 'FULL_STOP': 190, 'SOLIDUS': 191, 'GRAVE_ACCENT': 192, 'LEFT_SQUARE_BRACKET': 219, 'REVERSE_SOLIDUS': 220, 'RIGHT_SQUARE_BRACKET': 221, 'APOSTROPHE': 222};

(function () {
	/* 0 - 9 */
	for (var i = 48; i <= 57; i++) {
        KEY['' + (i - 48)] = i;
	}
	/* A - Z */
	for (i = 65; i <= 90; i++) {
        KEY['' + String.fromCharCode(i)] = i;
	}
	/* NUM_PAD_0 - NUM_PAD_9 */
	for (i = 96; i <= 105; i++) {
        KEY['NUM_PAD_' + (i - 96)] = i;
	}
	/* F1 - F12 */
	for (i = 112; i <= 123; i++) {
        KEY['F' + (i - 112 + 1)] = i;
	}
})();

// variables du jeu
Pacman.WALL    = 0;
Pacman.BISCUIT = 1;
Pacman.EMPTY   = 2;
Pacman.BLOCK   = 3;
Pacman.PILL    = 4;

// construction de la carte
Pacman.MAP = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
	[0, 4, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 4, 0],
	[0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
	[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
	[0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
	[0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
	[0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
	[2, 2, 2, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 2, 2, 2],
	[0, 0, 0, 0, 1, 0, 1, 0, 0, 3, 0, 0, 1, 0, 1, 0, 0, 0, 0],
	[2, 2, 2, 2, 1, 1, 1, 0, 3, 3, 3, 0, 1, 1, 1, 2, 2, 2, 2],
	[0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
	[2, 2, 2, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 2, 2, 2],
	[0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
	[0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
	[0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
	[0, 4, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 4, 0],
	[0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
	[0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
	[0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
	[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// les murs du niveau
Pacman.WALLS = [
    
    [{"move": [0, 9.5]}, {"line": [3, 9.5]},
     {"curve": [3.5, 9.5, 3.5, 9]}, {"line": [3.5, 8]},
     {"curve": [3.5, 7.5, 3, 7.5]}, {"line": [1, 7.5]},
     {"curve": [0.5, 7.5, 0.5, 7]}, {"line": [0.5, 1]},
     {"curve": [0.5, 0.5, 1, 0.5]}, {"line": [9, 0.5]},
     {"curve": [9.5, 0.5, 9.5, 1]}, {"line": [9.5, 3.5]}],

    [{"move": [9.5, 1]},
     {"curve": [9.5, 0.5, 10, 0.5]}, {"line": [18, 0.5]},
     {"curve": [18.5, 0.5, 18.5, 1]}, {"line": [18.5, 7]},
     {"curve": [18.5, 7.5, 18, 7.5]}, {"line": [16, 7.5]},
     {"curve": [15.5, 7.5, 15.5, 8]}, {"line": [15.5, 9]},
     {"curve": [15.5, 9.5, 16, 9.5]}, {"line": [19, 9.5]}],

    [{"move": [2.5, 5.5]}, {"line": [3.5, 5.5]}],

    [{"move": [3, 2.5]},
     {"curve": [3.5, 2.5, 3.5, 3]},
     {"curve": [3.5, 3.5, 3, 3.5]},
     {"curve": [2.5, 3.5, 2.5, 3]},
     {"curve": [2.5, 2.5, 3, 2.5]}],

    [{"move": [15.5, 5.5]}, {"line": [16.5, 5.5]}],

    [{"move": [16, 2.5]}, {"curve": [16.5, 2.5, 16.5, 3]},
     {"curve": [16.5, 3.5, 16, 3.5]}, {"curve": [15.5, 3.5, 15.5, 3]},
     {"curve": [15.5, 2.5, 16, 2.5]}],

    [{"move": [6, 2.5]}, {"line": [7, 2.5]}, {"curve": [7.5, 2.5, 7.5, 3]},
     {"curve": [7.5, 3.5, 7, 3.5]}, {"line": [6, 3.5]},
     {"curve": [5.5, 3.5, 5.5, 3]}, {"curve": [5.5, 2.5, 6, 2.5]}],

    [{"move": [12, 2.5]}, {"line": [13, 2.5]}, {"curve": [13.5, 2.5, 13.5, 3]},
     {"curve": [13.5, 3.5, 13, 3.5]}, {"line": [12, 3.5]},
     {"curve": [11.5, 3.5, 11.5, 3]}, {"curve": [11.5, 2.5, 12, 2.5]}],

    [{"move": [7.5, 5.5]}, {"line": [9, 5.5]}, {"curve": [9.5, 5.5, 9.5, 6]},
     {"line": [9.5, 7.5]}],
    [{"move": [9.5, 6]}, {"curve": [9.5, 5.5, 10.5, 5.5]},
     {"line": [11.5, 5.5]}],


    [{"move": [5.5, 5.5]}, {"line": [5.5, 7]}, {"curve": [5.5, 7.5, 6, 7.5]},
     {"line": [7.5, 7.5]}],
    [{"move": [6, 7.5]}, {"curve": [5.5, 7.5, 5.5, 8]}, {"line": [5.5, 9.5]}],

    [{"move": [13.5, 5.5]}, {"line": [13.5, 7]},
     {"curve": [13.5, 7.5, 13, 7.5]}, {"line": [11.5, 7.5]}],
    [{"move": [13, 7.5]}, {"curve": [13.5, 7.5, 13.5, 8]},
     {"line": [13.5, 9.5]}],

    [{"move": [0, 11.5]}, {"line": [3, 11.5]}, {"curve": [3.5, 11.5, 3.5, 12]},
     {"line": [3.5, 13]}, {"curve": [3.5, 13.5, 3, 13.5]}, {"line": [1, 13.5]},
     {"curve": [0.5, 13.5, 0.5, 14]}, {"line": [0.5, 17]},
     {"curve": [0.5, 17.5, 1, 17.5]}, {"line": [1.5, 17.5]}],
    [{"move": [1, 17.5]}, {"curve": [0.5, 17.5, 0.5, 18]}, {"line": [0.5, 21]},
     {"curve": [0.5, 21.5, 1, 21.5]}, {"line": [18, 21.5]},
     {"curve": [18.5, 21.5, 18.5, 21]}, {"line": [18.5, 18]},
     {"curve": [18.5, 17.5, 18, 17.5]}, {"line": [17.5, 17.5]}],
    [{"move": [18, 17.5]}, {"curve": [18.5, 17.5, 18.5, 17]},
     {"line": [18.5, 14]}, {"curve": [18.5, 13.5, 18, 13.5]},
     {"line": [16, 13.5]}, {"curve": [15.5, 13.5, 15.5, 13]},
     {"line": [15.5, 12]}, {"curve": [15.5, 11.5, 16, 11.5]},
     {"line": [19, 11.5]}],

    [{"move": [5.5, 11.5]}, {"line": [5.5, 13.5]}],
    [{"move": [13.5, 11.5]}, {"line": [13.5, 13.5]}],

    [{"move": [2.5, 15.5]}, {"line": [3, 15.5]},
     {"curve": [3.5, 15.5, 3.5, 16]}, {"line": [3.5, 17.5]}],
    [{"move": [16.5, 15.5]}, {"line": [16, 15.5]},
     {"curve": [15.5, 15.5, 15.5, 16]}, {"line": [15.5, 17.5]}],

    [{"move": [5.5, 15.5]}, {"line": [7.5, 15.5]}],
    [{"move": [11.5, 15.5]}, {"line": [13.5, 15.5]}],
    
    [{"move": [2.5, 19.5]}, {"line": [5, 19.5]},
     {"curve": [5.5, 19.5, 5.5, 19]}, {"line": [5.5, 17.5]}],
    [{"move": [5.5, 19]}, {"curve": [5.5, 19.5, 6, 19.5]},
     {"line": [7.5, 19.5]}],

    [{"move": [11.5, 19.5]}, {"line": [13, 19.5]},
     {"curve": [13.5, 19.5, 13.5, 19]}, {"line": [13.5, 17.5]}],
    [{"move": [13.5, 19]}, {"curve": [13.5, 19.5, 14, 19.5]},
     {"line": [16.5, 19.5]}],

    [{"move": [7.5, 13.5]}, {"line": [9, 13.5]},
     {"curve": [9.5, 13.5, 9.5, 14]}, {"line": [9.5, 15.5]}],
    [{"move": [9.5, 14]}, {"curve": [9.5, 13.5, 10, 13.5]},
     {"line": [11.5, 13.5]}],

    [{"move": [7.5, 17.5]}, {"line": [9, 17.5]},
     {"curve": [9.5, 17.5, 9.5, 18]}, {"line": [9.5, 19.5]}],
    [{"move": [9.5, 18]}, {"curve": [9.5, 17.5, 10, 17.5]},
     {"line": [11.5, 17.5]}],

    [{"move": [8.5, 9.5]}, {"line": [8, 9.5]}, {"curve": [7.5, 9.5, 7.5, 10]},
     {"line": [7.5, 11]}, {"curve": [7.5, 11.5, 8, 11.5]},
     {"line": [11, 11.5]}, {"curve": [11.5, 11.5, 11.5, 11]},
     {"line": [11.5, 10]}, {"curve": [11.5, 9.5, 11, 9.5]},
     {"line": [10.5, 9.5]}]
];

Object.prototype.clone = function () {
    var i, newObj = (this instanceof Array) ? [] : {};
    for (i in this) {
        if (i === 'clone') {
            continue;
        }
        if (this[i] && typeof this[i] === "object") {
            newObj[i] = this[i].clone();
        } else {
            newObj[i] = this[i];
        }
    }
    return newObj;
};


