import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "../design-system/components";
import { errorMessage } from "../domain/errors";

interface Props { children: ReactNode }
interface State { error?: Error }

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha ao renderizar a rota:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className="page"><Card>
      <h1>Não foi possível exibir esta tela</h1>
      <p role="alert">{errorMessage(this.state.error, "Erro inesperado ao renderizar a página.")}</p>
      <p className="help-text">Seus dados não foram apagados. Tente novamente ou recarregue a página; se o problema continuar, abra outra área pelo menu.</p>
      <div className="form-actions">
        <Button type="button" onClick={() => this.setState({ error: undefined })}>Tentar novamente</Button>
        <Button type="button" onClick={() => window.location.reload()}>Recarregar página</Button>
      </div>
    </Card></div>;
  }
}
