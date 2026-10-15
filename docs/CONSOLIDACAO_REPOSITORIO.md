# Consolidação dos checkouts Vivance — 10/10/2026

Atualização de referência em 14/10: este é o registro da consolidação, não o
inventário de deploy atual. O checkout **canônico** continua no caminho abaixo;
cópias temporárias isoladas de revisão/release não viram outra fonte de verdade.
Para branch, aplicação publicada e pendências, usar [Status](STATUS_ATUAL.md)
e conferir Git/ambiente. O SHA718e599 abaixo pertence ao fechamento de 10/10.

O **único checkout de trabalho** é `/Users/vitormilanez/Desktop/Codes/vivance`, Git standalone com remoto `vitormilanez/instituto-vivance`. A versão da aplicação publicada após os [PRs #106](https://github.com/vitormilanez/instituto-vivance/pull/106) e [#107](https://github.com/vitormilanez/instituto-vivance/pull/107) é `718e599d5d94ba1773baac741450b0e9f4481f78`; consulte Git para o HEAD documental. As sete pastas antigas foram removidas e a ausência foi conferida: `Instituto Vivance`, `vivance-repo`, `vivance-package-20261009`, `vivance-c3-contexto`, `vivance-ia2-exams`, `vivance-atual` e `vivance-release-main-20261009`. O checkout temporário usado na publicação foi movido para o caminho canônico; o clone temporário de inspeção do PR #78 também foi removido.

Antes da limpeza, uma comparação dirigida identificou que o antigo `worker.ts`, o helper/teste de progresso do onboarding e uma tela de carregamento existem no [PR #78](https://github.com/vitormilanez/instituto-vivance/pull/78) (`1e4493a`); a aplicação atual usa Edge/Cron e o onboarding integrado. A migration IA2 antiga foi substituída na main por uma versão com proteção de revisão imutável. Cinco cópias ` 2` de prescrições tinham conteúdo idêntico aos arquivos canônicos. Sete documentos históricos tinham corpo preservado no PR #78; teleconsulta e QA visual também constam da documentação atual. Nenhum código antigo precisou ser importado.

`.git` e parte do conteúdo dos checkouts antigos estavam sob iCloud e não permitiram certificar `git status` limpo de cada pasta nem comparar todas as cópias por hash. A revisão cobriu os caminhos substantivos identificados e preservou o histórico por Git/PR. Segredos locais necessários foram mantidos em arquivos ignorados e restritos no checkout canônico, sem copiar conteúdo para o repositório.
