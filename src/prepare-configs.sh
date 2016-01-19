#! /bin/sh

cp -f $1/*.ovpn $2
cp -f $1/*.crt $2

# namen der Configurationen bereinigen
rename 's/.ovpn/.conf/' $2/*.ovpn
rename 's/ipvanish-//' $2/*.conf

# einstellen der authentifizierung
sed -i 's/auth-user-pass/auth-user-pass \/etc\/openvpn\/user.txt/g' $2/*.conf
# setzen des tunel device
sed -i 's/dev tun/dev tun0/g' $2/*.conf
# redirect gateway hinzufügen
echo 'redirect-gateway' >> $2/*.conf
echo 'ca /etc/openvpn/ca.ipvanish.com.crt' >> $2/*.conf
