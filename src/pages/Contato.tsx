import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  MessageSquare,
  Clock,
  CheckCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import { enviarContato } from '../services/contatos';

interface ContactFormData {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  assunto: string;
  mensagem: string;
  site?: string;
}

const Contato: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      const r = await enviarContato(data);
      if (r.ok) {
        toast.success('Mensagem recebida. Vamos responder pelo e-mail que você informou.');
        reset();
      } else if (r.motivo === 'limite') {
        toast.error('Muitas mensagens em pouco tempo. Tente de novo mais tarde.');
      } else if (r.motivo === 'invalido') {
        toast.error('Confira os campos e tente de novo.');
      } else {
        toast.error('Não foi possível enviar agora. Tente de novo ou escreva para contato@liggasst.com.br.');
      }
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'E-mail',
      content: 'contato@liggasst.com.br',
      link: 'mailto:contato@liggasst.com.br'
    },
    {
      icon: Phone,
      title: 'Telefone',
      content: '(11) 98886-1490',
      link: 'tel:+5511988861490'
    },
    {
      icon: MapPin,
      title: 'Endereço',
      content: 'São Paulo, SP - Brasil',
      link: null
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MessageSquare size={64} className="mx-auto mb-6 text-green-light" />
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Entre em Contato
          </h1>
          <p className="font-roboto text-xl text-green-light">
            Estamos aqui para ajudar você. Envie sua mensagem e retornaremos em breve.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-neutral-gray p-8 rounded-2xl">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-6">
                Envie sua Mensagem
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nome Completo"
                    placeholder="Seu nome"
                    error={errors.nome?.message}
                    {...register('nome', { required: 'Nome é obrigatório' })}
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="seu@email.com"
                    error={errors.email?.message}
                    {...register('email', {
                      required: 'E-mail é obrigatório',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'E-mail inválido'
                      }
                    })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Telefone"
                    placeholder="(11) 98886-1490"
                    error={errors.telefone?.message}
                    {...register('telefone')}
                  />
                  <Input
                    label="Empresa"
                    placeholder="Nome da empresa"
                    error={errors.empresa?.message}
                    {...register('empresa')}
                  />
                </div>

                <Input
                  label="Assunto"
                  placeholder="Sobre o que você gostaria de falar?"
                  error={errors.assunto?.message}
                  {...register('assunto', { required: 'Assunto é obrigatório' })}
                />

                <div>
                  <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                    Mensagem
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Descreva sua dúvida ou solicitação..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    {...register('mensagem', { required: 'Mensagem é obrigatória' })}
                  />
                  {errors.mensagem && (
                    <p className="text-red-500 text-sm font-roboto mt-1">{errors.mensagem.message}</p>
                  )}
                </div>

                {/* Campo-isca contra robôs: fica fora da tela e sem foco. */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label>Não preencha este campo<input type="text" tabIndex={-1} autoComplete="off" {...register('site')} /></label>
                </div>

                <p className="font-roboto text-sm text-gray-600" data-testid="aviso-contato">
                  Usamos seus dados para responder esta mensagem e para proteger o formulário contra spam e abuso. Veja a{' '}
                  <a href={`${import.meta.env.BASE_URL}politica-de-privacidade/`} target="_blank" rel="noopener noreferrer" className="text-green-deep underline">Política de Privacidade</a>.
                </p>

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  size="lg"
                  icon={Send}
                >
                  Enviar Mensagem
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-6">
                  Informações de Contato
                </h2>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-light rounded-lg flex items-center justify-center flex-shrink-0">
                        <info.icon size={24} className="text-green-deep" />
                      </div>
                      <div>
                        <h3 className="font-poppins font-semibold text-lg text-soft-black">
                          {info.title}
                        </h3>
                        {info.link ? (
                          <a
                            href={info.link}
                            className="font-roboto text-gray-600 hover:text-green-deep transition-colors duration-200"
                          >
                            {info.content}
                          </a>
                        ) : (
                          <p className="font-roboto text-gray-600">{info.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-green-light bg-opacity-20 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <Clock size={24} className="text-green-deep mr-3" />
                  <h3 className="font-poppins font-semibold text-lg text-soft-black">
                    Horário de Atendimento
                  </h3>
                </div>
                <div className="space-y-2 font-roboto text-gray-700">
                  <p>Segunda a Sexta: 8h às 18h</p>
                  <p>Sábado: 8h às 12h</p>
                  <p>Domingo: Fechado</p>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-white border border-green-light p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <CheckCircle size={24} className="text-green-medium mr-3" />
                  <h3 className="font-poppins font-semibold text-lg text-soft-black">
                    Tempo de Resposta
                  </h3>
                </div>
                <p className="font-roboto text-gray-700">
                  Respondemos pelo e-mail informado, em dias úteis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contato;
