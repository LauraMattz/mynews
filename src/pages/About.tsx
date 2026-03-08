import { Heart, Github, Shield, Eye, Scale, Newspaper } from "lucide-react";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-lg">
          <Newspaper className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sobre o MyNews</h1>
        <p className="text-muted-foreground text-sm">
          Projeto open-source, sem fins comerciais, feito pela comunidade.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <Section icon={Heart} title="Propósito">
          O MyNews nasceu como um projeto educacional e comunitário para ajudar pessoas a acompanharem notícias relevantes sobre{" "}
          <strong>Tecnologia, Educação, Liderança e Equidade Racial</strong> de forma curada e inteligente.
          Não temos nenhum objetivo comercial — não vendemos dados, não cobramos pelo uso e não monetizamos o tráfego.
          A plataforma utiliza IA para classificar, filtrar e resumir grandes volumes de notícias, entregando apenas o que realmente importa.
        </Section>

        <Section icon={Github} title="Open Source">
          Todo o código-fonte é aberto e disponível para consulta, auditoria e contribuição.
          Acreditamos que a transparência é a melhor forma de construir confiança.
          Qualquer pessoa pode verificar exatamente o que fazemos com os dados.
        </Section>

        <Section icon={Shield} title="Privacidade & LGPD">
          Não coletamos nenhum dado pessoal de usuários. As únicas informações armazenadas são dados públicos
          de artigos obtidos via RSS: título, descrição, link e data de publicação. Não armazenamos nomes,
          telefones, e-mails ou qualquer informação que identifique pessoas.
        </Section>

        <Section icon={Scale} title="Compliance & Boas Práticas">
          Utilizamos exclusivamente feeds RSS públicos, respeitando os termos de uso de cada fonte.
          Aplicamos rate-limiting nas requisições e sempre atribuímos a fonte original do artigo.
          Caso algum portal solicite a remoção de seus dados, atenderemos prontamente.
        </Section>

        <Section icon={Eye} title="Como Funciona">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Coletamos notícias via feeds RSS de fontes públicas brasileiras</li>
            <li>Filtramos conteúdo irrelevante (horóscopo, fofocas, esportes, anúncios)</li>
            <li>IA classifica cada artigo nos 4 pilares temáticos com score de relevância</li>
            <li>Resumos estruturados são gerados automaticamente para os artigos aprovados</li>
            <li>Você faz a triagem final com votos 👍/👎 para refinar as recomendações</li>
          </ol>
        </Section>
      </div>

    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed pl-10">
        {children}
      </div>
    </div>
  );
}
