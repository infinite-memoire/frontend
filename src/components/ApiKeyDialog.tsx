import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, AlertCircle } from 'lucide-react';
import { claudeService } from '@/services/claudeService';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyDialogProps {
  children: React.ReactNode;
  onApiKeySet?: () => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ children, onApiKeySet }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une clé API valide",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.startsWith('sk-ant-api03-')) {
      toast({
        title: "Erreur",
        description: "La clé API Claude doit commencer par 'sk-ant-api03-'",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      claudeService.setApiKey(apiKey);
      
      toast({
        title: "Clé API configurée",
        description: "Votre clé API Claude a été sauvegardée localement",
      });
      
      setIsOpen(false);
      setApiKey('');
      onApiKeySet?.();
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de configurer la clé API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="vintage-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Key className="w-5 h-5" />
            Configuration API Claude
          </DialogTitle>
          <DialogDescription>
            Configurez votre clé API Claude pour activer la génération d'histoires
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border border-border/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Sécurité:</p>
                <p>Votre clé API sera stockée localement dans votre navigateur et ne sera jamais partagée.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api-key">Clé API Claude</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Obtenez votre clé API sur{' '}
              <a 
                href="https://console.anthropic.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSaveApiKey}
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isLoading ? 'Configuration...' : 'Configurer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyDialog;