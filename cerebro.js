(function(){
"use strict";

// -----------------------------------------------------------------------
// Estado da aplicação: array de objetos em memória
// -----------------------------------------------------------------------
var registros = [];
var selecionado = null;     // ID do registro selecionado

// -----------------------------------------------------------------------
// Parseia o texto CSV/TXT em array de objetos
// -----------------------------------------------------------------------
function parseTexto(texto){
    var linhas = texto.split(/\r?\n/);
    var resultado = [];
    for(var i=0;i<linhas.length;i++){
        var linha = linhas[i].trim();
        if(linha === "") continue;
        var sep = linha.indexOf(",") !== -1 ? "," : (linha.indexOf(";") !== -1 ? ";" : undefined);
        if(sep === undefined){
            continue;
        }
        var partes = linha.split(sep);
        if(partes.length < 4) continue;
        for(var j=0;j<partes.length;j++){
            partes[j] = partes[j].trim().replace(/^"(.*)"$/, "$1");
        }
        var registro = {
            id: partes[0],
            nome: partes[1],
            email: partes[2],
            telefone: partes[3]
        };
        if(partes.length > 4){
            registro.extra = partes.slice(4).join(sep);
        }
        resultado.push(registro);
    }
    return resultado;
}

// -----------------------------------------------------------------------
// Converte registros para formato CSV ou TXT
// -----------------------------------------------------------------------
function registrosParaTexto(regs, formato){
    var linhas = [];
    for(var i=0;i<regs.length;i++){
        var r = regs[i];
        if(formato === "csv"){
            linhas.push('"' + r.id + '","' + r.nome.replace(/"/g,'""') + '","' + r.email.replace(/"/g,'""') + '","' + r.telefone.replace(/"/g,'""') + '"');
        } else {
            linhas.push(r.id + "," + r.nome + "," + r.email + "," + r.telefone);
        }
    }
    return linhas.join("\n");
}

// -----------------------------------------------------------------------
// DOM references
// -----------------------------------------------------------------------
var fileInput        = document.getElementById("fileInput");
var dadosTexto       = document.getElementById("dadosTexto");
var campoBusca       = document.getElementById("campoBusca");
var campoOrdenar     = document.getElementById("campoOrdenar");
var formatoExportar  = document.getElementById("formatoExportar");
var resultadoDiv     = document.getElementById("resultado");
var resultadoContent = document.getElementById("resultadoContent");
var tabela           = document.getElementById("tabela");
var tabelaBody       = document.getElementById("tabelaBody");
var mensagemDiv      = document.getElementById("mensagem");

// -----------------------------------------------------------------------
// Funções auxiliares para mensagens
// -----------------------------------------------------------------------
function mostrarMensagem(msg, tipo){
    mensagemDiv.textContent = msg;
    mensagemDiv.style.display = "block";
    if(tipo === "erro"){
        mensagemDiv.style.color = "#721c24";
        mensagemDiv.style.background = "#f8d7da";
        mensagemDiv.style.borderColor = "#f5c6cb";
    } else if(tipo === "sucesso"){
        mensagemDiv.style.color = "#155724";
        mensagemDiv.style.background = "#d4edda";
        mensagemDiv.style.borderColor = "#c3e6cb";
    } else {
        mensagemDiv.style.color = "#383d41";
        mensagemDiv.style.background = "#e2e3e5";
        mensagemDiv.style.borderColor = "#d6d8db";
    }
    setTimeout(function(){ mensagemDiv.style.display = "none"; }, 5000);
}

// -----------------------------------------------------------------------
// Carrega arquivo via file input
// -----------------------------------------------------------------------
function carregarArquivo(file){
    var reader = new FileReader();
    reader.onload = function(e){
        var texto = e.target.result;
        registros = parseTexto(texto);
        if(registros.length === 0){
            mostrarMensagem("Nenhum registro válido encontrado no arquivo. Verifique o formato.", "erro");
            return;
        }
        mostrarMensagem("Carregados " + registros.length + " registros do arquivo.", "sucesso");
        dadosTexto.value = texto;
        atualizarResultado();
    };
    reader.onerror = function(){
        mostrarMensagem("Erro ao ler arquivo.", "erro");
    };
    reader.readAsText(file);
}

// Evento: botão carregar
document.getElementById("btCarregar").addEventListener("click", function(){
    if(fileInput.files.length === 0){
        mostrarMensagem("Selecione um arquivo antes de carregar.", "erro");
        return;
    }
    carregarArquivo(fileInput.files[0]);
});

// Evento: quando arquivo selecionado
fileInput.addEventListener("change", function(){
    if(fileInput.files.length > 0){
        carregarArquivo(fileInput.files[0]);
    }
});

// -----------------------------------------------------------------------
// Função para Salvar com o mesmo nome e perguntar se deseja substituir
// -----------------------------------------------------------------------
async function salvarComMensagemSubstituir(texto, nomeArquivoPadrao, extensao){
    // Se o navegador suportar a API moderna, ele abre a janela nativa do OS
    // que já lista o arquivo existente com o mesmo nome e avisa/pergunta se quer substituir.
    if (window.showSaveFilePicker) {
        try {
            var mimeType = extensao === "csv" ? "text/csv" : "text/plain";
            var opcoes = {
                suggestedName: nomeArquivoPadrao,
                types: [{
                    description: "Arquivo " + extensao.toUpperCase(),
                    accept: {}
                }]
            };
            opcoes.types[0].accept[mimeType] = ["." + extensao];

            var handle = await window.showSaveFilePicker(opcoes);
            var writable = await handle.createWritable();
            await writable.write(texto);
            await writable.close();
            mostrarMensagem("Arquivo salvo com sucesso!", "sucesso");
            return;
        } catch (err) {
            if (err.name !== "AbortError") {
                console.error(err);
                mostrarMensagem("Erro ao salvar o arquivo.", "erro");
            }
            return;
        }
    }
    
    // Fallback padrão de download caso o navegador bloqueie a API
    var blob = new Blob([texto], {type: extensao === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivoPadrao;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarMensagem("Arquivo salvo com sucesso.", "sucesso");
}

// Botão Exportar / Salvar
document.getElementById("btExportar").addEventListener("click", async function(){
    if(registros.length === 0){
        mostrarMensagem("Nenhum registro para exportar.", "erro");
        return;
    }
    var formato = formatoExportar ? formatoExportar.value.toLowerCase() : "csv";
    var texto = registrosParaTexto(registros, formato);
    var nome = "registros." + formato; // Mantém o mesmo nome padrão fixo
    await salvarComMensagemSubstituir(texto, nome, formato);
});

// Botão Salvar (memoria / txt)
document.getElementById("btSalvarMemoria").addEventListener("click", async function(){
    if(registros.length === 0){
        mostrarMensagem("Nenhum registro para salvar. Carregue ou informe dados primeiro.", "erro");
        return;
    }
    var texto = registrosParaTexto(registros, "txt");
    var nome = "registros.txt"; // Mantém o mesmo nome padrão fixo
    await salvarComMensagemSubstituir(texto, nome, "txt");
});

// -----------------------------------------------------------------------
// Listar todos
// -----------------------------------------------------------------------
function listarTodos(){
    if(registros.length === 0){
        resultadoContent.textContent = "Nenhum registro na memória. Carregue um arquivo ou informe dados manualmente.";
        tabela.style.display = "none";
        return;
    }
    var html = "<p>Total: <strong>" + registros.length + "</strong> registros.</p>";
    var corpo = "";
    for(var i=0;i<registros.length;i++){
        var r = registros[i];
        corpo += "<tr>" +
            "<td>" + (i+1) + "</td>" +
            "<td>" + escaparHTML(r.id) + "</td>" +
            "<td>" + escaparHTML(r.nome) + "</td>" +
            "<td>" + escaparHTML(r.email) + "</td>" +
            "<td>" + escaparHTML(r.telefone) + "</td>" +
            "<td><button onclick='window._sel(" + escaparHTML(r.id) + ")'>Selecionar</button></td>" +
            "</tr>";
    }
    tabelaBody.innerHTML = corpo;
    resultadoContent.innerHTML = html + "<table id='tabela'><thead><tr><th>#</th><th>ID</th><th>Nome</th><th>Email</th><th>Telefone</th><th>Ações</th></tr></thead><tbody>" + corpo + "</tbody></table>";
    tabela.style.display = "table";
    window._sel = function(id){
        selecionado = id;
        listarTodos();
        mostrarMensagem("Registro ID=" + id + " selecionado para exclusão.", "informacao");
    };
}

document.getElementById("btListar").addEventListener("click", listarTodos);

// -----------------------------------------------------------------------
// Buscar
// -----------------------------------------------------------------------
function buscar(){
    var termo = campoBusca.value.trim().toLowerCase();
    if(termo === ""){
        mostrarMensagem("Informe um termo de busca.", "erro");
        return;
    }
    var resultados = [];
    for(var i=0;i<registros.length;i++){
        var r = registros[i];
        if(r.id.toLowerCase().indexOf(termo) !== -1 ||
           r.nome.toLowerCase().indexOf(termo) !== -1 ||
           r.email.toLowerCase().indexOf(termo) !== -1 ||
           r.telefone.toLowerCase().indexOf(termo) !== -1){
            resultados.push(r);
        }
    }
    if(resultados.length === 0){
        resultadoContent.textContent = "Nenhum registro encontrado para '" + escaparHTML(termo) + "'.";
        tabela.style.display = "none";
        return;
    }
    var corpo = "";
    for(var j=0;j<resultados.length;j++){
        var r = resultados[j];
        corpo += "<tr>" +
            "<td>" + (j+1) + "</td>" +
            "<td>" + escaparHTML(r.id) + "</td>" +
            "<td>" + escaparHTML(r.nome) + "</td>" +
            "<td>" + escaparHTML(r.email) + "</td>" +
            "<td>" + escaparHTML(r.telefone) + "</td>" +
            "<td><button onclick='window._sel(" + escaparHTML(r.id) + ")'>Selecionar</button></td>" +
            "</tr>";
    }
    window._sel = function(id){
        selecionado = id;
        buscar();
        mostrarMensagem("Registro ID=" + id + " selecionado para exclusão.", "informacao");
    };
    resultadoContent.innerHTML = "<p>Resultados para '<strong>" + escaparHTML(termo) + "</strong>': <strong>" + resultados.length + "</strong> encontrado(s).</p>";
    tabelaBody.innerHTML = corpo;
    tabela.style.display = "table";
    mostrarMensagem("Busca concluída: " + resultados.length + " resultado(s).", "sucesso");
}

document.getElementById("btBuscar").addEventListener("click", buscar);

// -----------------------------------------------------------------------
// Ordenar
// -----------------------------------------------------------------------
function ordenarLista(){
    var campo = parseInt(campoOrdenar.value, 10);
    if(isNaN(campo) || campo < 0 || campo > 3){
        mostrarMensagem("Campo de ordenação inválido. Use 0 (ID), 1 (Nome), 2 (Email) ou 3 (Telefone).", "erro");
        return;
    }
    var nomesCampos = ["id","nome","email","telefone"];
    var nomeCampo = nomesCampos[campo];
    registros.sort(function(a,b){
        var va = (a[nomeCampo] || "").toString().toLowerCase();
        var vb = (b[nomeCampo] || "").toString().toLowerCase();
        if(va < vb) return -1;
        if(va > vb) return 1;
        return 0;
    });
    atualizarResultado();
    mostrarMensagem("Lista ordenada por " + nomeCampo + ".", "sucesso");
}

document.getElementById("btOrdenar").addEventListener("click", ordenarLista);
document.getElementById("btOrdenarLista").addEventListener("click", ordenarLista);

// -----------------------------------------------------------------------
// Excluir registro selecionado
// -----------------------------------------------------------------------
function excluirSelecionado(){
    if(selecionado === null){
        mostrarMensagem("Nenhum registro selecionado. Liste ou busque e selecione um registro.", "erro");
        return;
    }
    var idx = -1;
    for(var i=0;i<registros.length;i++){
        if(registros[i].id == selecionado){
            idx = i;
            break;
        }
    }
    if(idx === -1){
        mostrarMensagem("Registro selecionado não encontrado na lista.", "erro");
        selecionado = null;
        return;
    }
    var removido = registros[idx];
    registros.splice(idx, 1);
    selecionado = null;
    atualizarResultado();
    mostrarMensagem("Registro ID=" + removido.id + " (" + removido.nome + ") excluído com sucesso.", "sucesso");
}

document.getElementById("btExcluirSelecionado").addEventListener("click", excluirSelecionado);

// -----------------------------------------------------------------------
// Limpar dados
// -----------------------------------------------------------------------
document.getElementById("btLimpar").addEventListener("click", function(){
    registros = [];
    selecionado = null;
    dadosTexto.value = "";
    tabela.style.display = "none";
    resultadoContent.textContent = "Dados limpos. Carregue um arquivo ou informe dados manualmente.";
    mostrarMensagem("Dados limpos.", "informacao");
});

// -----------------------------------------------------------------------
// Atualiza o resultado com a lista atual
// -----------------------------------------------------------------------
function atualizarResultado(){
    if(registros.length === 0){
        resultadoContent.textContent = "Nenhum registro na memória.";
        tabela.style.display = "none";
        return;
    }
    listarTodos();
}

// -----------------------------------------------------------------------
// Carrega dados do textarea manualmente
// -----------------------------------------------------------------------
dadosTexto.addEventListener("blur", function(){
    var texto = dadosTexto.value.trim();
    if(texto === "") return;
    var parsed = parseTexto(texto);
    if(parsed.length > 0 && parsed.length !== registros.length){
        registros = parsed;
        selecionado = null;
        mostrarMensagem("Carregados " + registros.length + " registros do textarea.", "sucesso");
        atualizarResultado();
    }
});

// -----------------------------------------------------------------------
// Helper: escapar HTML
// -----------------------------------------------------------------------
function escaparHTML(str){
    if(str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// -----------------------------------------------------------------------
// Inicialização
// -----------------------------------------------------------------------
var exemplo = "1,Ana Silva,ana@email.com,11 99999-9999\n2,Bruno Costa,bruno@email.com,11 88888-8888\n3,Carla Mendes,carla@email.com,11 77777-7777\n4,Danilo Oliveira,danilo@email.com,11 66666-6666\n5,Eva Rodrigues,eva@email.com,11 55555-5555";
dadosTexto.value = exemplo;

// Exporta para uso externo
window.registrosApp = {
    getRegistros: function(){ return registros.slice(); },
    setRegistros: function(r){ registros = r; },
    getSelecionado: function(){ return selecionado; }
};

})();
//feito por DANIEL DA SILVA LIMA, EU FIZ SOZINNHO.//
